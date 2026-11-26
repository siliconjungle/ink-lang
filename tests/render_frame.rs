use serde_json::Value;
use std::{fs, path::Path, process::Command};

#[test]
fn builds_a_frame_and_rejects_invalid_passes() {
    let directory = Path::new("build/render-frame-test");
    fs::create_dir_all(directory).unwrap();
    let source = directory.join("frame.ink");
    let shader = directory.join("frame.wgsl");
    let artifact = directory.join("artifact");
    fs::write(&shader, r#"
        @vertex fn corner(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
            let x = f32((i << 1u) & 2u);
            let y = f32(i & 2u);
            return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
        }
        @fragment fn paint() -> @location(0) vec4f { return vec4f(0.0, 0.5, 0.0, 1.0); }
        @group(0) @binding(0) var previous: texture_2d<f32>;
        @fragment fn finish(@builtin(position) p: vec4f) -> @location(0) vec4f {
            return textureLoad(previous, vec2i(p.xy), 0);
        }
    "#).unwrap();
    let frame = r#"
        module RenderExample;
        import "std:render" as render;
        fn first() -> render.Pass {
            return render.Pass {
                vertex: "corner", fragment: "paint", topology: render.Topology.Triangles,
                blend: false, attachments: [render.clear("intermediate", 255)],
                bindings: [], draw: render.direct(3, 1),
            };
        }
        fn second() -> render.Pass {
            return render.Pass {
                vertex: "corner", fragment: "finish", topology: render.Topology.Triangles,
                blend: false, attachments: [render.clear("surface", 255)],
                bindings: [render.Binding { slot: 0, source: "intermediate",
                    resource: render.Resource.FloatTexture, vertex: false, fragment: true }],
                draw: render.direct(3, 1),
            };
        }
        pub fn frame() -> render.Frame {
            return render.Frame {
                textures: [render.Texture { name: "intermediate", scale: 1, format: render.TextureFormat.Rgba8Unorm }],
                passes: [first(), second()],
            };
        }
    "#;
    let build = || Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("build-render").arg(&source).arg("frame")
        .arg("--shader").arg(&shader).arg("-o").arg(&artifact)
        .output().unwrap();
    fs::write(&source, frame).unwrap();
    let success = build();
    assert!(success.status.success(), "{}", String::from_utf8_lossy(&success.stderr));
    let manifest: Value = serde_json::from_slice(&fs::read(artifact.join("frame.json")).unwrap()).unwrap();
    assert_eq!(manifest["passes"][1]["bindings"][0]["source"], "intermediate");
    assert_eq!(manifest["passes"][1]["draw"]["packed_count"], Value::Null);
    assert!(artifact.join("render.rs").is_file() && artifact.join("render.mjs").is_file());
    for (invalid, diagnostic) in [
        (frame.replace("first(), second()", "second(), first()"), "must come from a prior pass"),
        (frame.replace("slot: 0", "slot: 1"), "no compatible render binding"),
        (frame.replace("render.clear(\"intermediate\", 255)", "render.load(\"intermediate\")"), "invalid attachment"),
        (frame.replace("fragment: \"paint\"", "fragment: \"missing\""), "missing Fragment shader entry"),
    ] {
        fs::write(&source, invalid).unwrap();
        let failure = build();
        assert!(!failure.status.success());
        let error = String::from_utf8_lossy(&failure.stderr);
        assert!(error.contains(diagnostic), "{diagnostic}: {error}");
    }
}
