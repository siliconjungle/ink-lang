# Render frames

Import `std:render` to describe a sequence of raster passes once. A pure
zero-argument Ink function returns a `render.Frame`. Build it with a WGSL
shader module containing the vertex and fragment entry points.

```sh
ink build-render scene.ink frame --shader scene.wgsl -o build/render
```

A frame declares temporary color textures at integer multiples of the output
size. The adapter supplies the texture view named `surface`. Each pass
specifies its shader entries, topology, premultiplied blending, attachments,
resources, and draw. An attachment can clear to a packed RGBA8 color, clear
to a named value supplied by the adapter, or load the preceding pass's image.
The builder checks the WGSL module, shader slots and stages, output locations,
attachment sizes, and order of texture reads and writes.

A `ViewportFrame` can scale a texture's width and height independently and
restrict a draw to an integer rectangle measured in output-size units. The
hosts encode consecutive draws that load the same attachments in one render
pass. This lets several viewport regions of an atlas share the same attachments.
`ViewportFrameWithFallback` selects a checked separate frame when its primary
textures exceed the device limits.

Use `render.direct(vertices, instances)` for a fixed draw or
`render.packed(vertices, "name")` to use the leading u32 of a resident
Ink GPU list as the instance count. Bind that same list as read-only storage
and supply its buffer with `COPY_SRC` usage. The generated renderer patches the
draw arguments on the GPU and reuses them across passes with the same source
and vertex count. It retains draw arguments, textures, and pipelines across
frames. On wgpu backends without this indirect path, callers supply an upper
bound for the draw and the shader must discard instances past the list count.

Rust includes the generated `render.rs` module alongside the other build
artifacts. It uses wgpu 30, serde, and serde_json. WebGPU imports
`createRenderFrame` from the generated `render.mjs`. Create a frame when the
surface size or format changes, bind named buffers when their allocations
change, then encode its draws into an existing command encoder. Compute and
raster can share a device and resident buffers. Applications still control
the surface, command submission, and any ordering relative to work outside
the frame.

The current binding model uses group zero and supports uniform buffers,
read-only storage buffers, and 2D float textures addressed with
`textureLoad`. These frames use procedural vertices and color attachments.
Depth/stencil attachments, vertex buffers, samplers, and compute scheduling
remain outside this interface.
