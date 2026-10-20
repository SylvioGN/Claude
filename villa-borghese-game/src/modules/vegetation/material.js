// The plant materials: vertex-colour Lambert plus a few small shader tweaks.
//  * The per-instance colour only tints foliage (aLeaf), so trunks and pots keep their colour.
//  * Foliage sways gently, each tree with its own phase.
//  * Leaves facing down glow a little, as if the sun shone through them, so the underside of a
//    crown overhead reads as green shade rather than a black ceiling.
//  * Near-detail plants right in front of the camera, or between the camera and the cart, dissolve
//    with a steady 4x4 ordered dither (2x2-pixel cells) so the chase camera never stares into a
//    canopy or loses the cart. The far-detail meshes never get that close, so their variant has no
//    discard at all and keeps the GPU's early depth rejection.
// Both variants share one set of uniforms.
import * as THREE from 'three';

export function createPlantMaterials() {
  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0.011 },
    uCart: { value: new THREE.Vector3() },
    uSeeThrough: { value: 0 },
    uTranslucent: { value: 0.55 },
  };
  return { near: plantMaterial(uniforms, true), far: plantMaterial(uniforms, false), uniforms };
}

function plantMaterial(uniforms, dissolve) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aLeaf;
uniform float uTime;
uniform float uWind;
varying float vUnderLeaf;
${dissolve ? 'uniform vec3 uCart;\nvarying vec3 vCartView;' : ''}`)
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
vUnderLeaf = aLeaf * max( 0.0, - objectNormal.y );
${dissolve ? 'vCartView = ( viewMatrix * vec4( uCart, 1.0 ) ).xyz;' : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTranslucent;
varying float vUnderLeaf;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * uTranslucent * vUnderLeaf;`);
    if (dissolve) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uSeeThrough;
varying vec3 vCartView;
const float BAYER[16] = float[16]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{
  vec3 p = - vViewPosition;
  float keep = smoothstep( 1.5, 4.5, length( p ) );
  if ( uSeeThrough > 0.5 ) {
    float t = dot( p, vCartView ) / dot( vCartView, vCartView );
    if ( t > 0.0 && t < 0.96 ) keep = min( keep, smoothstep( 1.4, 2.3, length( p - vCartView * t ) / mix( 0.55, 1.0, t ) ) );
  }
  if ( keep < 0.999 ) {
    ivec2 cell = ivec2( mod( floor( gl_FragCoord.xy * 0.5 ), 4.0 ) );
    float threshold = ( BAYER[ cell.y * 4 + cell.x ] + 0.5 ) / 16.0;
    if ( keep < 0.15 || keep < threshold ) discard;
  }
}`);
    }
  };
  material.customProgramCacheKey = () => (dissolve ? 'villa-plants-near-3' : 'villa-plants-far-3');
  return material;
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
