import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, useGLTF } from "@react-three/drei";
import { EffectComposer, Noise, DepthOfField, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

/**
 * Scène flat-lay : un tapis de liège vu de dessus, l'objet central au milieu et quelques
 * accessoires posés autour. L'objet central change avec le scroll :
 *   0 → 1/3  vinyle (musique)   1/3 → 2/3  ticket (films, concerts)   2/3 → 1  livre (livres, manga)
 *
 * Remplacement par un vrai modèle : renseigner MODEL_URL avec un .glb compressé Draco
 * placé dans /public/models. Il prendra la place des trois objets procéduraux.
 */
const MODEL_URL: string | null = null;

const C = {
  cork: "#061a55",
  orange: "#f4550a",
  ink: "#0059ff",
  cream: "#f4f6fb",
  black: "#060607",
};

export interface SceneDriver {
  /** 0 → 1 : avancement du scroll dans le récit. */
  progress: number;
  /** 0 → 1 : avancement de l'intro (descente caméra). */
  intro: number;
  /** -1 → 1 : position de la souris pour la parallaxe. */
  mouse: { x: number; y: number };
}

// ---------- textures procédurales ----------
function useCorkTexture() {
  return useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d")!;
    g.fillStyle = C.cork;
    g.fillRect(0, 0, s, s);
    // granulés du liège
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = Math.random() * 2.2 + 0.4;
      const l = Math.random();
      g.fillStyle = l > 0.5 ? `rgba(2,8,30,${0.18 + Math.random() * 0.3})` : `rgba(70,110,210,${0.08 + Math.random() * 0.18})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

function useGrooveTexture() {
  return useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d")!;
    g.fillStyle = C.black;
    g.fillRect(0, 0, s, s);
    for (let r = 80; r < 252; r += 1.6) {
      g.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
      g.stroke();
    }
    // étiquette centrale orange avec le K
    g.fillStyle = C.orange;
    g.beginPath();
    g.arc(s / 2, s / 2, 72, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.cream;
    g.font = "800 64px Inter Tight, Inter, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("K", s / 2, s / 2 + 4);
    g.fillStyle = C.black;
    g.beginPath();
    g.arc(s / 2, s / 2, 6, 0, Math.PI * 2);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

function useTicketTexture(big = true) {
  return useMemo(() => {
    const w = 1024;
    const h = 420;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = C.cream;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.orange;
    g.fillRect(0, 0, 150, h);
    g.setLineDash([10, 10]);
    g.strokeStyle = "rgba(3,9,35,.5)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(760, 20);
    g.lineTo(760, h - 20);
    g.stroke();
    g.fillStyle = "#030923";
    g.font = "800 120px Inter Tight, Inter, sans-serif";
    g.fillText("KRITIQ", 190, 190);
    g.font = "500 30px Inter, sans-serif";
    g.fillText(big ? "ADMIT ONE · RANG A · 10/10" : "ADMIT ONE", 194, 270);
    g.font = "800 90px Inter Tight, Inter, sans-serif";
    g.save();
    g.translate(900, h / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = "center";
    g.fillText("Nº 042", 0, 30);
    g.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [big]);
}

function useBlobTexture() {
  return useMemo(() => {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(1,4,18,0.8)");
    grd.addColorStop(0.55, "rgba(1,4,18,0.38)");
    grd.addColorStop(1, "rgba(1,4,18,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);
}

/** Ombre douce posée sur le liège, sous un objet. */
function Blob({ size, position = [0, 0, 0], opacity = 1 }: { size: [number, number]; position?: [number, number, number]; opacity?: number }) {
  const tex = useBlobTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.004, position[2]]} renderOrder={-1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  );
}

// ---------- objets ----------
function Vinyl() {
  const tex = useGrooveTexture();
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.9;
  });
  return (
    <group>
      {/* pochette dessous, légèrement décalée */}
      <RoundedBox args={[3.5, 0.05, 3.5]} radius={0.02} position={[0.55, -0.05, 0.35]} rotation={[0, 0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0b2a78" roughness={0.85} />
      </RoundedBox>
      <group ref={ref}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.62, 1.62, 0.04, 96]} />
          <meshPhysicalMaterial attach="material-0" color={C.black} roughness={0.45} specularIntensity={0.12} envMapIntensity={0.05} />
          <meshPhysicalMaterial attach="material-1" map={tex} roughness={0.45} specularIntensity={0.12} envMapIntensity={0.05} />
          <meshPhysicalMaterial attach="material-2" color={C.black} roughness={0.45} specularIntensity={0.12} envMapIntensity={0.05} />
        </mesh>
      </group>
    </group>
  );
}

function Ticket() {
  const tex = useTicketTexture(true);
  return (
    <group rotation={[0, -0.18, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.02, 1.48]} />
        <meshStandardMaterial attach="material-0" color={C.cream} roughness={0.9} />
        <meshStandardMaterial attach="material-1" color={C.cream} roughness={0.9} />
        <meshStandardMaterial attach="material-2" map={tex} roughness={0.92} />
        <meshStandardMaterial attach="material-3" color={C.cream} roughness={0.9} />
        <meshStandardMaterial attach="material-4" color={C.cream} roughness={0.9} />
        <meshStandardMaterial attach="material-5" color={C.cream} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Book() {
  return (
    <group rotation={[0, 0.22, 0]}>
      {/* couverture */}
      <RoundedBox args={[2.3, 0.42, 3.1]} radius={0.04} castShadow receiveShadow>
        <meshStandardMaterial color={C.ink} roughness={0.75} />
      </RoundedBox>
      {/* tranche de pages */}
      <mesh position={[0.06, 0, 0]} castShadow>
        <boxGeometry args={[2.2, 0.34, 3.0]} />
        <meshStandardMaterial color={C.cream} roughness={0.95} />
      </mesh>
      {/* bandeau orange */}
      <mesh position={[0, 0.215, 0.95]}>
        <boxGeometry args={[2.31, 0.01, 0.42]} />
        <meshStandardMaterial color={C.orange} roughness={0.8} />
      </mesh>
      {/* marque-page */}
      <mesh position={[0.6, 0.0, -1.62]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.16, 0.01, 0.5]} />
        <meshStandardMaterial color={C.orange} roughness={0.7} />
      </mesh>
    </group>
  );
}

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, true); // true = décodeur Draco
  return <primitive object={scene} />;
}

function Hero({ driver }: { driver: MutableRefObject<SceneDriver> }) {
  const group = useRef<THREE.Group>(null);
  const objs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];

  useFrame((state, dt) => {
    const p = driver.current.progress;
    const intro = driver.current.intro;
    const g = group.current;
    if (!g) return;
    // apparition à l'intro
    const appear = THREE.MathUtils.smoothstep(intro, 0.35, 1);
    g.position.y = THREE.MathUtils.lerp(2.2, 0.06, appear);
    g.scale.setScalar(THREE.MathUtils.lerp(0.6, 0.9, appear));
    // inclinaison continue + légère respiration
    g.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.03;
    // chaque objet occupe un tiers ; il reste à plat au repos et se retourne seulement
    // pendant les passages d'un objet à l'autre (pour ne jamais traverser le plateau,
    // l'objet se soulève pendant le retournement)
    const seg = Math.min(2.999, p * 3);
    let lift = 0;
    objs.forEach((r, i) => {
      const o = r.current;
      if (!o) return;
      const d = seg - i; // <0 avant, 0..1 actif, >1 après
      const enter = i === 0 ? 1 : THREE.MathUtils.smoothstep(d, -0.12, 0.12);
      const exit = i === objs.length - 1 ? 0 : THREE.MathUtils.smoothstep(d, 0.82, 1.06);
      const vis = enter * (1 - exit);
      const flip = (1 - enter) * -Math.PI * 0.5 + exit * Math.PI * 0.5;
      lift = Math.max(lift, Math.sin(Math.abs(flip)) * 1.6 * vis);
      o.scale.setScalar(THREE.MathUtils.damp(o.scale.x, Math.max(vis, 0.0001), 10, dt));
      o.rotation.x = THREE.MathUtils.damp(o.rotation.x, flip, 8, dt);
      o.rotation.y = THREE.MathUtils.damp(o.rotation.y, d * -0.6, 4, dt);
      o.visible = o.scale.x > 0.01;
    });
    g.position.y += lift;
  });

  return (
    <>
    <CentralShadow driver={driver} />
    <group ref={group}>
      {MODEL_URL ? (
        <Suspense fallback={null}>
          <GlbModel url={MODEL_URL} />
        </Suspense>
      ) : (
        <>
          <group ref={objs[0]}>
            <Vinyl />
          </group>
          <group ref={objs[1]} scale={0.0001}>
            <Ticket />
          </group>
          <group ref={objs[2]} scale={0.0001}>
            <Book />
          </group>
        </>
      )}
    </group>
    </>
  );
}

/** Ombre sous l'objet central : s'étale et pâlit quand l'objet se soulève. */
function CentralShadow({ driver }: { driver: MutableRefObject<SceneDriver> }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useBlobTexture();
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const p = driver.current.progress * 3;
    const frac = p - Math.floor(p);
    const lifting = Math.floor(p) < 2 ? THREE.MathUtils.smoothstep(frac, 0.82, 0.94) * (1 - THREE.MathUtils.smoothstep(frac, 0.94, 1)) : 0;
    const intro = THREE.MathUtils.smoothstep(driver.current.intro, 0.4, 1);
    const target = (1 + lifting * 0.6) * 4.6;
    m.scale.x = m.scale.y = THREE.MathUtils.damp(m.scale.x, target, 6, dt);
    (m.material as THREE.MeshBasicMaterial).opacity = intro * (0.85 - lifting * 0.45);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0.35, 0.003, 0.25]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0} />
    </mesh>
  );
}

function Props() {
  const small = useTicketTexture(false);
  return (
    <group>
      {/* crayon */}
      <group position={[-4.3, 0.12, 1.6]} rotation={[0, 0.7, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.11, 2.6, 6]} />
          <meshStandardMaterial color={C.orange} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow>
          <coneGeometry args={[0.11, 0.3, 6]} />
          <meshStandardMaterial color="#d9b48a" roughness={0.8} />
        </mesh>
        <mesh position={[0, -1.36, 0]} castShadow>
          <cylinderGeometry args={[0.115, 0.115, 0.14, 12]} />
          <meshStandardMaterial color="#b9b3a8" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
      {/* petit ticket déchiré */}
      <mesh position={[2.9, 0.02, -3.3]} rotation={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.015, 0.78]} />
        <meshStandardMaterial attach="material-2" map={small} roughness={0.9} />
        <meshStandardMaterial attach="material-0" color={C.cream} />
        <meshStandardMaterial attach="material-1" color={C.cream} />
        <meshStandardMaterial attach="material-3" color={C.cream} />
        <meshStandardMaterial attach="material-4" color={C.cream} />
        <meshStandardMaterial attach="material-5" color={C.cream} />
      </mesh>
      <Blob size={[3.4, 1.3]} position={[-4.3, 0, 1.6]} opacity={0.5} />
      <Blob size={[1.8, 1.8]} position={[5.2, 0, -0.4]} opacity={0.8} />
      {/* tampon */}
      <group position={[5.2, 0, -0.4]}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.42, 0.5, 0.7, 32]} />
          <meshStandardMaterial color={C.ink} roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.32, 24, 16]} />
          <meshStandardMaterial color={C.ink} roughness={0.6} />
        </mesh>
      </group>
      {/* pastilles de note posées en vrac */}
      {[
        [-3.4, -2.3, 0.3],
        [-2.6, -2.7, -0.2],
        [-3.9, -1.6, 0.6],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.03, z]} rotation={[0, r, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 32]} />
          <meshStandardMaterial color={i === 1 ? C.orange : C.cream} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ driver }: { driver: MutableRefObject<SceneDriver> }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  useFrame((_, dt) => {
    const { intro, mouse, progress } = driver.current;
    const e = 1 - Math.pow(1 - intro, 3); // easeOutCubic
    // la caméra descend sur le décor pendant l'intro
    const y = THREE.MathUtils.lerp(26, 11 - progress * 1.2, e);
    const z = THREE.MathUtils.lerp(0.01, 2.2, e);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, mouse.x * 0.6, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 6, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z + mouse.y * 0.5, 3, dt);
    camera.lookAt(look);
  });
  return null;
}

function Board() {
  const cork = useCorkTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={cork} roughness={0.95} color="#6a86e0" />
    </mesh>
  );
}

export default function Scene({ driver, quality }: { driver: MutableRefObject<SceneDriver>; quality: "high" | "low" }) {
  return (
    <Canvas
      shadows="soft"
      dpr={quality === "high" ? [1, 1.8] : [1, 1.25]}
      camera={{ fov: 32, position: [0, 26, 0.01], near: 0.1, far: 100 }}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#030923"]} />
      <hemisphereLight args={["#ffffff", "#030923", 0.4]} />
      <directionalLight
        position={[-3, 14, 2.5]}
        intensity={1.35}
        color="#ffffff"
        castShadow
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1536, 1536]}
        shadow-radius={6}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      {/* Éclairage HDRI construit sur place (pas de fichier à télécharger) */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} color="#ffffff" />
        <Lightformer intensity={0.8} position={[-6, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} color="#dfe7ff" />
        <Lightformer intensity={0.5} position={[6, 2, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} color="#c8d4ff" />
      </Environment>
      <Rig driver={driver} />
      <Board />
      <Props />
      <Hero driver={driver} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {quality === "high" ? (
          <DepthOfField focusDistance={0.0} focalLength={0.06} bokehScale={1.1} height={480} />
        ) : (
          <></>
        )}
        <Noise opacity={0.35} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.22} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
