import { Effect, PostProcess, Texture } from '@babylonjs/core';
import type { Engine } from '@babylonjs/core/Engines/engine';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

/** Babylon port of the original bodycam barrel distortion, RGB split, scanlines and vignette. */
export class BodycamPostProcess {
  private readonly pass: PostProcess;
  private fear = 0;

  constructor(camera: UniversalCamera, engine: Engine) {
    Effect.ShadersStore['bodycamFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform float time;
      uniform float aberration;
      uniform float distortion;

      void main(void) {
        vec2 cc = vUV - 0.5;
        float dist = dot(cc, cc);
        vec2 uv = vUV + cc * dist * distortion;
        vec2 offset = cc * (aberration + dist * 0.012);
        float r = texture2D(textureSampler, uv + offset).r;
        float g = texture2D(textureSampler, uv).g;
        float b = texture2D(textureSampler, uv - offset).b;
        vec3 col = vec3(r, g, b);
        float scanline = sin(uv.y * 750.0 + time * 8.0) * 0.025;
        float vignette = 1.0 - smoothstep(0.18, 0.65, dist);
        col = (col - scanline) * vignette;
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    this.pass = new PostProcess(
      'bodycam-post-process',
      'bodycam',
      ['time', 'aberration', 'distortion'],
      null,
      1,
      camera,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
      false,
    );
    this.pass.onApply = effect => {
      effect.setFloat('time', performance.now() * .001);
      effect.setFloat('aberration', .0025 + this.fear * .016);
      effect.setFloat('distortion', .09);
    };
  }

  setFear(value: number): void {
    this.fear = Math.max(0, Math.min(.85, value));
  }

  dispose(): void { this.pass.dispose(); }
}
