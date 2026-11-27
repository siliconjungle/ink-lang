// Ink render host for WebGPU. The compiler embeds the checked frame and WGSL.
export async function createRenderFrame(device, surfaceFormat, width, height, clearParameters = {}) {
  const limit = device.limits.maxTextureDimension2D;
  const heightScale = texture => texture.height_scale ?? texture.scale;
  const selected = [frame, frame.fallback].find(candidate => candidate?.textures.every(
    texture => width * texture.scale <= limit && height * heightScale(texture) <= limit));
  if (![width, height].every(size => Number.isInteger(size) && size > 0 && size <= limit) ||
      !selected) {
    throw new Error('Render frame textures exceed device limits');
  }
  const module = device.createShaderModule({ label: 'Ink render frame', code: shader });
  const formats = new Map([['surface', surfaceFormat]]);
  const scales = new Map([['surface', [1, 1]]]);
  const textures = new Map();
  const layouts = new Map();
  const allocations = [];
  const packed = new Map();
  const over = { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' };
  const rgba = word => [24, 16, 8, 0].map(shift => (word >>> shift & 255) / 255);
  const close = () => {
    for (const allocation of allocations) allocation.destroy();
  };
  try {
    for (const descriptor of selected.textures) {
      const { name, scale } = descriptor;
      const format = descriptor.format === 'Rgba8Unorm' ? 'rgba8unorm' : 'rgba16float';
      const texture = device.createTexture({
        label: name, size: [scale * width, heightScale(descriptor) * height], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      allocations.push(texture);
      formats.set(name, format);
      scales.set(name, [scale, heightScale(descriptor)]);
      textures.set(name, texture.createView());
    }
    const passes = await Promise.all(selected.passes.map(async pass => {
      const bindingKey = JSON.stringify(pass.bindings);
      if (!layouts.has(bindingKey)) {
        const layout = device.createBindGroupLayout({ entries: pass.bindings.map(layoutEntry) });
        layouts.set(bindingKey, { layout, bindings: pass.bindings });
      }
      const surfaceSlots = [];
      const colorAttachments = pass.attachments.map((attachment, index) => {
        const view = textures.get(attachment.target);
        if (!view) surfaceSlots.push(index);
        const { clear_parameter: parameter } = attachment;
        if (parameter !== null && !Object.hasOwn(clearParameters, parameter)) {
          throw new Error(`Missing render clear value ${parameter}`);
        }
        return { view, loadOp: attachment.load ? 'load' : 'clear', storeOp: 'store',
          clearValue: parameter === null ? rgba(attachment.rgba) : clearParameters[parameter] };
      });
      const { packed_count: source, vertices } = pass.draw;
      const drawKey = source === null ? null : `${source}:${vertices}`;
      if (drawKey !== null && !packed.has(drawKey)) {
        const args = device.createBuffer({ label: source, size: 16,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT });
        allocations.push(args);
        device.queue.writeBuffer(args, 0, new Uint32Array([vertices, 0, 0, 0]));
        packed.set(drawKey, { source, args });
      }
      const pipeline = await device.createRenderPipelineAsync({
        label: pass.fragment,
        layout: device.createPipelineLayout({ bindGroupLayouts: [layouts.get(bindingKey).layout] }),
        vertex: { module, entryPoint: pass.vertex },
        fragment: {
          module, entryPoint: pass.fragment, targets: pass.attachments.map(({ target }) => ({
            format: formats.get(target), ...(pass.blend && { blend: { color: over, alpha: over } }),
          })),
        },
        primitive: { topology: pass.topology === 'Triangles' ? 'triangle-list' : 'triangle-strip' },
      });
      const targets = pass.attachments.map(attachment => attachment.target);
      const [xScale, yScale] = scales.get(targets[0]);
      const region = pass.viewport ?? { x: 0, y: 0, width: xScale, height: yScale };
      const viewport = [region.x * width, region.y * height, region.width * width, region.height * height];
      return { pipeline, bindingKey, surfaceSlots, descriptor: { colorAttachments }, pass, drawKey, targets, viewport };
    }));
    return {
      bind(buffers) {
        const buffer = name => {
          if (!Object.hasOwn(buffers, name)) throw new Error(`Missing render buffer ${name}`);
          return buffers[name];
        };
        const copies = Array.from(packed.values(), ({ source, args }) => {
          const input = buffer(source);
          if (!(input.usage & GPUBufferUsage.COPY_SRC) || input.size < 4) {
            throw new Error(`Packed count ${source} needs a four-byte COPY_SRC header`);
          }
          return { input, args };
        });
        const groups = new Map();
        for (const [key, { layout, bindings }] of layouts) {
          groups.set(key, device.createBindGroup({
            layout, entries: bindings.map(binding => ({ binding: binding.slot,
              resource: binding.resource === 'FloatTexture' ? textures.get(binding.source) :
                { buffer: buffer(binding.source) } })),
          }));
        }
        return { copies, groups: passes.map(pass => groups.get(pass.bindingKey)) };
      },
      draw(encoder, target, bindings) {
        for (const { input, args } of bindings.copies) encoder.copyBufferToBuffer(input, 0, args, 4, 4);
        for (let index = 0; index < passes.length;) {
          const { descriptor, surfaceSlots, targets } = passes[index];
          for (const slot of surfaceSlots) descriptor.colorAttachments[slot].view = target;
          const raster = encoder.beginRenderPass(descriptor);
          do {
            const { pipeline, pass, viewport, drawKey } = passes[index];
            raster.setViewport(...viewport, 0, 1);
            raster.setScissorRect(...viewport);
            raster.setPipeline(pipeline);
            raster.setBindGroup(0, bindings.groups[index]);
            if (drawKey === null) raster.draw(pass.draw.vertices, pass.draw.instances);
            else raster.drawIndirect(packed.get(drawKey).args, 0);
            index++;
          } while (index < passes.length && passes[index].targets.length === targets.length &&
            passes[index].pass.attachments.every((attachment, slot) => attachment.load && attachment.target === targets[slot]));
          raster.end();
          for (const slot of surfaceSlots) descriptor.colorAttachments[slot].view = undefined;
        }
      },
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}

function layoutEntry(binding) {
  const visibility = (binding.vertex ? GPUShaderStage.VERTEX : 0) |
    (binding.fragment ? GPUShaderStage.FRAGMENT : 0);
  const slot = { binding: binding.slot, visibility };
  if (binding.resource === 'FloatTexture') {
    return { ...slot, texture: { sampleType: 'unfilterable-float' } };
  }
  return { ...slot, buffer: { type: binding.resource === 'Uniform' ? 'uniform' : 'read-only-storage' } };
}
