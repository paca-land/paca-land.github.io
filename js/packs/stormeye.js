import * as THREE from 'three';

// The storm's eye, dressed: a tornado twists its way slowly round the island's
// edge, throwing leaves and planks about, and a wall of storm cloud turns all
// round the island, with the calm eye in the middle.

const TAU = Math.PI * 2;
const HEIGHT = 7.5;

// A funnel that sways and spins: stripes running up and round it, fading at the edges.
const FUNNEL_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float k = p.y / ${HEIGHT.toFixed(1)};
    p.x += sin(uTime * 0.7 + k * 3.0) * 0.5 * k;
    p.z += cos(uTime * 0.6 + k * 2.4) * 0.4 * k;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vFade = abs(dot(n, normalize(cameraPosition - world.xyz)));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const FUNNEL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float bands = sin(vUv.x * 6.2832 * 5.0 + vUv.y * 14.0 - uTime * 7.0) * 0.5 + 0.5;
    float streak = sin(vUv.x * 6.2832 * 11.0 - vUv.y * 9.0 - uTime * 11.0) * 0.5 + 0.5;
    vec3 c = mix(vec3(0.1, 0.11, 0.13), vec3(0.3, 0.31, 0.34), bands * 0.6 + streak * 0.25);
    c *= mix(1.0, 0.35, uNight);
    float a = (0.5 + bands * 0.35) * smoothstep(0.0, 0.5, vFade) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
    gl_FragColor = vec4(c, a);
  }
`;

function build({ top, shape, r }) {
  const group = new THREE.Group();
  const rim = top.rings[top.rings.length - 1];
  const reach = Math.max(...rim.map((v) => Math.hypot(v.x, v.z)));
  // The funnel: narrow at the ground, wide where it meets the cloud.
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const k = i / 16;
    profile.push(new THREE.Vector2(0.18 + k ** 2.2 * 2.1 + Math.sin(k * 9) * 0.05, k * HEIGHT));
  }
  const uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  const funnel = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), new THREE.ShaderMaterial({
    uniforms, vertexShader: FUNNEL_VERTEX, fragmentShader: FUNNEL_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  funnel.renderOrder = 2;
  const twister = new THREE.Group();
  twister.add(funnel);
  // Dust at its foot, and leaves and planks whirling round it.
  const dustMat = new THREE.MeshStandardMaterial({ color: '#8a8478', flatShading: true, transparent: true, opacity: 0.55, depthWrite: false });
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), dustMat, 14);
  const junk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: '#7a5a3a', flatShading: true }), 22);
  const junkColor = new THREE.Color();
  for (let i = 0; i < 22; i++) junk.setColorAt(i, junkColor.set(['#7a5a3a', '#4a7a3a', '#6a8a42', '#a07a4a'][i % 4]));
  for (const mesh of [dust, junk]) {
    mesh.frustumCulled = false;
    twister.add(mesh);
  }
  group.add(twister);
  const debris = Array.from({ length: 22 }, (_, i) => ({ h: r.range(0.3, HEIGHT * 0.8), a: r.range(0, TAU), speed: r.range(2.5, 4.5), spin: r.range(2, 6) }));

  // The eye wall: dark cloud turning all the way round the island, low down
  // round its rim, so it frames the island rather than hiding it.
  const wallMat = new THREE.MeshStandardMaterial({ color: '#4a5058', flatShading: true, transparent: true, opacity: 0.6, depthWrite: false });
  const PUFFS = 80;
  const wall = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), wallMat, PUFFS);
  wall.frustumCulled = false;
  const puffs = Array.from({ length: PUFFS }, (_, i) => ({ a: (i / PUFFS) * TAU + r.range(-0.05, 0.05), d: reach + r.range(1.5, 4.5), y: r.range(-4, 0.8), s: r.range(1.2, 2.4) }));
  group.add(wall);

  // The tornado's path: round the island, well inside the rim.
  const path = reach * 0.68;
  let angle = r.range(0, TAU);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    object: group,
    mirrorHide: [group],
    update(time, dt, env) {
      uniforms.uTime.value = time;
      uniforms.uNight.value = env.night;
      angle += dt * 0.04;
      const x = Math.cos(angle) * path, z = Math.sin(angle) * path;
      twister.position.set(x, shape.heightAt(x, z) - 0.1, z);
      for (let i = 0; i < 14; i++) {
        const a = time * 3 + i * 0.45, k = (time * 0.6 + i / 14) % 1;
        m.compose(p.set(Math.cos(a) * (0.4 + k), k * 0.6, Math.sin(a) * (0.4 + k)), q, s.setScalar(0.5 + k * 1.2));
        dust.setMatrixAt(i, m);
      }
      debris.forEach((d, i) => {
        d.a += dt * d.speed;
        const k = d.h / HEIGHT, rad = 0.4 + k ** 2.2 * 2.1 + 0.3;
        m.compose(p.set(Math.cos(d.a) * rad + Math.sin(time * 0.7 + k * 3) * 0.5 * k, d.h, Math.sin(d.a) * rad), q.setFromEuler(e.set(time * d.spin, d.a, time * d.spin * 0.6)), s.setScalar(1));
        junk.setMatrixAt(i, m);
      });
      puffs.forEach((pf, i) => {
        const a = pf.a + time * 0.05;
        m.compose(p.set(Math.cos(a) * pf.d, pf.y + Math.sin(time * 0.3 + i) * 0.3, Math.sin(a) * pf.d), q, s.setScalar(pf.s));
        wall.setMatrixAt(i, m);
      });
      for (const mesh of [dust, junk, wall]) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export default { id: 'stormeye', dress: { build } };
