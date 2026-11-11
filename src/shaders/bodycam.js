// Шейдер «боди-камеры»: бочкообразное искажение, хроматическая аберрация, скан-линии, виньетка.

export const BodycamShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    aberration: { value: 0.0025 },
    distortion: { value: 0.09 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float aberration;
    uniform float distortion;
    varying vec2 vUv;

    void main() {
      vec2 cc = vUv - 0.5;
      float dist = dot(cc, cc);
      vec2 uv = vUv + cc * dist * distortion;

      vec2 offset = cc * (aberration + dist * 0.012);
      float r = texture2D(tDiffuse, uv + offset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - offset).b;

      vec3 col = vec3(r, g, b);
      float scanline = sin(uv.y * 750.0 + time * 8.0) * 0.025;
      float vignette = smoothstep(0.65, 0.18, dist);
      col = (col - scanline) * vignette;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
