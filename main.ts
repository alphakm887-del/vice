import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';

const $ = (id: string) => document.getElementById(id)!;
const loading = $('loading'), hud = $('hud'), pauseLayer = $('pause');
const toastEl = $('toast');
let toastTimer = 0;
function toast(message: string) { toastEl.textContent = message; toastEl.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb9c8);
scene.fog = new THREE.Fog(0x9bb9c8, 100, 520);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, .1, 900);
camera.position.set(0, 6, 12);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc8e7ff, 0x53604a, 2.1));
const sun = new THREE.DirectionalLight(0xffedcf, 3.2); sun.position.set(-80, 120, 45); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100; scene.add(sun);

const mat = (color: number, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const groundMat = mat(0x647b69), roadMat = mat(0x242e36), lineMat = mat(0xe5d8a5), sidewalkMat = mat(0x9a9b91), glassMat = new THREE.MeshStandardMaterial({ color: 0x39718b, roughness: .24, metalness: .4 });
const boxGeo = new THREE.BoxGeometry(1,1,1);
function box(w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number,cast=true) { const m=new THREE.Mesh(boxGeo,material); m.scale.set(w,h,d); m.position.set(x,y,z); m.castShadow=cast; m.receiveShadow=true; scene.add(m); return m; }

await RAPIER.init();
const world = new RAPIER.World({x:0,y:-9.81,z:0}); world.timestep = 1/60;
const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.35,0));
world.createCollider(RAPIER.ColliderDesc.cuboid(250,.35,250), floorBody);
box(500,.3,500,groundMat,0,-.35,0,false);

// A compact, connected coastal district: four avenues, cross streets and collision-safe blocks.
const road = (w:number,d:number,x:number,z:number) => { box(w,.035,d,roadMat,x,.015,z,false); };
road(250,18,0,0); road(250,18,0,62); road(250,18,0,-62); road(18,250,0,0); road(18,250,62,0); road(18,250,-62,0);
for(let i=-110;i<=110;i+=8){ box(.18,.025,1.2,lineMat,i,.04,0,false); box(1.2,.025,.18,lineMat,0,.04,i,false); }
// Sidewalk strips
for(const z of [-11,11,51,73,-73,-51]) box(250,.22,2,sidewalkMat,0,.11,z,false);
for(const x of [-11,11,51,73,-73,-51]) box(2,.22,250,sidewalkMat,x,.11,0,false);

const buildingMats = [mat(0x8a9ba4),mat(0xc1b9a5),mat(0x536c7d),mat(0xd1c6ad),mat(0x52605d),mat(0x9b7770)];
let seed=4812; const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let gx=-4;gx<=4;gx++) for(let gz=-4;gz<=4;gz++){
  if(Math.abs(gx)<=1||Math.abs(gz)<=1) continue;
  const x=gx*25+(rand()-.5)*5,z=gz*25+(rand()-.5)*5;
  const w=12+rand()*8,d=12+rand()*8,h=9+rand()*34;
  const b=box(w,h,d,buildingMats[Math.floor(rand()*buildingMats.length)],x,h/2,z);
  const windows = new THREE.Group();
  const rows=Math.floor(h/3.2), cols=Math.floor(w/2.7);
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const win=new THREE.Mesh(new THREE.BoxGeometry(.95,1.15,.05),glassMat);
    win.position.set(x-w/2+1.4+c*2.5,2+r*3.1,z-d/2-.03); windows.add(win);
  }
  scene.add(windows); b.userData.windows=windows;
}
// Palm trees and street lights, using shared geometry/materials.
const trunkGeo=new THREE.CylinderGeometry(.22,.34,4.5,7), leafGeo=new THREE.ConeGeometry(2.4,1.1,7), trunkMat=mat(0x79543a), leafMat=mat(0x247b58);
for(let x=-105;x<=105;x+=18) for(const z of [-15,15]){ const trunk=new THREE.Mesh(trunkGeo,trunkMat); trunk.position.set(x,2.2,z); trunk.castShadow=true; scene.add(trunk); for(let k=0;k<6;k++){const leaf=new THREE.Mesh(leafGeo,leafMat);leaf.position.set(x+Math.cos(k*Math.PI/3)*1.25,4.1,z+Math.sin(k*Math.PI/3)*1.25);leaf.rotation.z=-.55;scene.add(leaf);} }
// Ocean and beach beyond the eastern boulevard.
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(190,250),new THREE.MeshStandardMaterial({color:0x167f9c,roughness:.25,metalness:.18})); ocean.rotation.x=-Math.PI/2; ocean.position.set(170,-.18,0); scene.add(ocean);
const beach=box(24,.12,250,mat(0xd6c18e),123,-.05,0,false);

// Parked vehicles are actual rigid bodies with simplified box colliders.
type Vehicle={body:RAPIER.RigidBody; mesh:THREE.Group; speed:number; color:number};
const vehicles:Vehicle[]=[];
function makeCar(x:number,z:number,color:number,playerCar=false):Vehicle{
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,.85,z).setLinearDamping(.7).setAngularDamping(3).setCanSleep(false));
 body.setAdditionalMass(1050,true); body.setEnabledRotations(false,true,false);
 world.createCollider(RAPIER.ColliderDesc.cuboid(1.05,.48,2.05).setFriction(.9),body);
 const g=new THREE.Group(); const paint=mat(color,.27,.65), dark=mat(0x111a22,.3,.2), tyre=mat(0x111111);
 const chassis=new THREE.Mesh(new THREE.BoxGeometry(2.1,.65,4.1),paint); chassis.position.y=.05; chassis.castShadow=true; g.add(chassis);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.65,.72,2.05),glassMat); cabin.position.set(0,.68,-.15); cabin.castShadow=true; g.add(cabin);
 for(const wx of [-.92,.92]) for(const wz of [-1.35,1.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.22,16),tyre);wheel.rotation.z=Math.PI/2;wheel.position.set(wx,-.25,wz);g.add(wheel);}
 for(const hx of [-.66,.66]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.35,.18,.06),mat(0xeaf6ff,.2));lamp.position.set(hx,.12,-2.08);g.add(lamp);}
 scene.add(g); const v={body,mesh:g,speed:0,color};vehicles.push(v);return v;
}
const playerCar=makeCar(5,8,0x16a6c8,true);
makeCar(-16,20,0xd95b43);makeCar(19,-19,0xd5dce0);makeCar(-26,-17,0x333d9c);makeCar(77,22,0xc7a24a);

// Player uses a kinematic capsule controller when not driving.
const playerBody=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1.2,15));
const playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.38),playerBody);
const characterController=world.createCharacterController(.08); characterController.setSlideEnabled(true); characterController.setMaxSlopeClimbAngle(Math.PI/3); characterController.setMinSlopeSlideAngle(Math.PI/4);
const playerMesh=new THREE.Group();
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.7,4,8),mat(0x243d64)); torso.position.y=1.15; torso.castShadow=true;playerMesh.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat(0xb98261));head.position.y=1.8;head.castShadow=true;playerMesh.add(head);
const legs=new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.3),mat(0x202a35));legs.position.y=.48;playerMesh.add(legs);scene.add(playerMesh);
let activeVehicle:Vehicle|null=null, paused=false, cameraMode=0, playerYaw=0, verticalVelocity=0;
const keys=new Set<string>();
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Escape'){paused=!paused;pauseLayer.classList.toggle('hidden',!paused);}if(e.code==='KeyC')cameraMode=(cameraMode+1)%2;if(e.code==='KeyE'&&!e.repeat)toggleVehicle();});
window.addEventListener('keyup',e=>keys.delete(e.code));
$('resume').addEventListener('click',()=>{paused=false;pauseLayer.classList.add('hidden');});
$('reset').addEventListener('click',()=>{if(activeVehicle){activeVehicle.body.setTranslation({x:5,y:1,z:8},true);activeVehicle.body.setLinvel({x:0,y:0,z:0},true);activeVehicle.body.setAngvel({x:0,y:0,z:0},true);}else{playerBody.setTranslation({x:0,y:1.2,z:15},true);}toast('Position reset');paused=false;pauseLayer.classList.add('hidden');});
function toggleVehicle(){if(activeVehicle){const p=activeVehicle.body.translation();const yaw=activeVehicle.mesh.rotation.y;const exitPos={x:p.x+Math.cos(yaw)*2.3,y:1.2,z:p.z+Math.sin(yaw)*2.3};playerBody.setNextKinematicTranslation(exitPos);playerYaw=yaw;activeVehicle=null;playerMesh.visible=true;toast('Exited vehicle');return;}
 let nearest:Vehicle|null=null,dist=4.2;const p=playerBody.translation();for(const v of vehicles){const q=v.body.translation();const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<dist){dist=d;nearest=v;}}
 if(nearest){activeVehicle=nearest;playerMesh.visible=false;toast('Vehicle acquired — drive safe');}else toast('No vehicle nearby');}

// Ambient skyline blocks, pier structures, road furniture.
for(let i=0;i<16;i++){const x=90+rand()*90,z=(rand()-.5)*210;box(3,1.2,3,mat(0x6e7779),x,.6,z);}
for(let x=-100;x<=100;x+=35){box(.25,7,.25,mat(0x293c46),x,3.5,-22);box(.25,7,.25,mat(0x293c46),x,3.5,22);}

let last=performance.now(),accumulator=0,elapsed=0;
const clock=new THREE.Clock();
function update(dt:number){
 if(paused)return;
 elapsed+=dt;
 if(activeVehicle){
  const b=activeVehicle.body;const vel=b.linvel();const yaw=activeVehicle.mesh.rotation.y;
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const throttle=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
  const steer=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0);
  const speed=vel.x*forward.x+vel.z*forward.z;
  const accel=throttle*(keys.has('Space')?26:17);
  b.applyImpulse({x:forward.x*accel*dt*1050,y:0,z:forward.z*accel*dt*1050},true);
  const grip=keys.has('Space')?.985:.93;
  b.setLinvel({x:vel.x*grip,y:vel.y,z:vel.z*grip},true);
  if(Math.abs(speed)>.5)b.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw+steer*dt*Math.min(1.8,Math.abs(speed)*.045)*Math.sign(speed)).normalize(),true);
  activeVehicle.speed=Math.abs(speed)*3.6;
 }else{
  const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const move=new THREE.Vector3(side,0,-forward);if(move.lengthSq()>0){move.normalize();playerYaw=Math.atan2(-move.x,-move.z);const distance=(keys.has('ShiftLeft')?8:4.5)*dt;const p=playerBody.translation();const desired={x:move.x*distance,y:0,z:move.z*distance};characterController.computeColliderMovement(playerCollider,desired);const corrected=characterController.computedMovement();playerBody.setNextKinematicTranslation({x:p.x+corrected.x,y:p.y+corrected.y,z:p.z+corrected.z});}
  else {const p=playerBody.translation();playerBody.setNextKinematicTranslation({x:p.x,y:p.y,z:p.z});}
 }
 world.step();
 for(const v of vehicles){const p=v.body.translation(),r=v.body.rotation();v.mesh.position.set(p.x,p.y,p.z);v.mesh.quaternion.set(r.x,r.y,r.z,r.w);}
 const p=activeVehicle?activeVehicle.body.translation():playerBody.translation();if(!activeVehicle){playerMesh.position.set(p.x-.0,p.y-.95,p.z);playerMesh.rotation.y=playerYaw;}
 const target=new THREE.Vector3(p.x,p.y+(activeVehicle?1.1:1.4),p.z);
 const camOffset=activeVehicle?(cameraMode===0?new THREE.Vector3(0,5,10):new THREE.Vector3(0,1.5,0)):new THREE.Vector3(0,4.3,7.5);
 if(activeVehicle){const yaw=activeVehicle.mesh.rotation.y;camOffset.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);}else camOffset.applyAxisAngle(new THREE.Vector3(0,1,0),playerYaw);
 const desiredCam=target.clone().add(camOffset);camera.position.lerp(desiredCam,1-Math.pow(.001,dt));camera.lookAt(target);
 $('speed').textContent=String(Math.round(activeVehicle?.speed??0)).padStart(2,'0');$('speed-meter').style.width=`${Math.min(100,(activeVehicle?.speed??0)/180*100)}%`;$('vehicle-type').textContent=activeVehicle?'SPORT COUPE':'ON FOOT';
 $('hint').textContent=activeVehicle?'WASD drive · Space handbrake · E exit':'WASD move · Shift sprint · E enter nearby vehicle';
}
function animate(now:number){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;accumulator+=dt;while(accumulator>=1/60){update(1/60);accumulator-=1/60;}renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));});
$('district-name').textContent='DOWNTOWN VICE';
setTimeout(()=>{loading.classList.add('hidden');hud.classList.remove('hidden');toast('Welcome to Vice Coast — explore the city');},700);
requestAnimationFrame(animate);
