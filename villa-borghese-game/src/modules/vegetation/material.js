// The one material every plant shares: vertex-colour Lambert plus three small shader tweaks.
//  * The per-instance colour only tints foliage (aLeaf), so trunks and pots keep their colour.
//  * Foliage sways gently, each tree with its own phase.
//  * Plants right in front of the camera, or between the camera and the cart, dissolve with a
//    screen-door dither so the chase camera never stares into a canopy or loses the cart.
import * as THREE from 'three';

export function createPlantMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0.011 },
    uCart: { value: new THREE.Vector3() },
    uSeeThrough: { value: 0 },
  };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aLeaf;
uniform float uTime;
uniform float uWind;
uniform vec3 uCart;
varying vec3 vCartView;`)
      .replace('#include <color_vertex>', `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
  vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  vColor *= mix( vec3( 1.0 ), instanceColor, aLeaf );
#endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec2 plantXZ = instanceMatrix[3].xz;
#else
  vec2 plantXZ = vec2( 0.0 );
#endif
float swayPhase = uTime * 1.5 + plantXZ.x * 0.21 + plantXZ.y * 0.17;
float sway = aLeaf * transformed.y * uWind * ( 0.65 + 0.35 * sin( uTime * 0.4 + plantXZ.x * 0.03 ) );
transformed.x += sin( swayPhase ) * sway;
transformed.z += sin( swayPhase * 0.83 + 1.7 ) * sway * 0.6;
vCartView = ( viewMatrix * vec4( uCart, 1.0 ) ).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSeeThrough;
varying vec3 vCartView;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{
  vec3 p = - vViewPosition;
  float keep = smoothstep( 1.5, 4.5, length( p ) );
  if ( uSeeThrough > 0.5 ) {
    float t = dot( p, vCartView ) / dot( vCartView, vCartView );
    if ( t > 0.0 && t < 0.96 ) keep = min( keep, smoothstep( 1.4, 2.3, length( p - vCartView * t ) / mix( 0.55, 1.0, t ) ) );
  }
  float dither = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  if ( keep < dither ) discard;
}`);
  };
  material.customProgramCacheKey = () => 'villa-plants-1';
  return { material, uniforms };
}

// Soft dark disc under every crown: skylight occlusion, and the only ground shadow on 'low'.
export function createShadeMaterial(util, opacity) {
  const tex = util.canvasTexture(64, 64, (g, w, h) => {
    // alphaMap reads the green channel, so paint an opaque grey ramp
    const gr = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(0.55, '#999');
    gr.addColorStop(1, '#000');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, { wrap: false, srgb: false });
  return new THREE.MeshBasicMaterial({
    color: '#1e2a10', alphaMap: tex, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
