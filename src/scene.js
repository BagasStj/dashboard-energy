import * as THREE from 'three';

export function createPlant(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xe8f7ff, 0xbcb293, 2.7));
  const sun = new THREE.DirectionalLight(0xffe3b1, 4.2);
  sun.position.set(-16, 30, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -33, right: 33, top: 30, bottom: -25, near: 1, far: 100 });
  sun.shadow.normalBias = .035;
  sun.shadow.bias = -.0002;
  scene.add(sun);
  const materials = {};
  function material(color, metalness = 0, roughness = .65) {
    const key = `${color}-${metalness}`;
    return materials[key] ||= new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }
  function mesh(geometry, color, parent, x, y, z, metalness = 0) {
    const m = new THREE.Mesh(geometry, material(color, metalness));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w,h,d,color,parent,x,y,z,metalness=0) { return mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z,metalness); }
  function cylinder(rt,rb,h,color,parent,x,y,z) { return mesh(new THREE.CylinderGeometry(rt,rb,h,20),color,parent,x,y,z); }
  box(48,.6,29,0xdcd5c2,world,0,-.4,1);
  box(48,.06,3.3,0xb6b9b5,world,0,-.05,5.5);
  box(48,.08,.12,0xf5efe2,world,0,.01,3.8);
  box(48,.08,.12,0xf5efe2,world,0,.01,7.2);
  for(let x=-23;x<24;x+=3) box(1.5,.025,.05,0xf3eedb,world,x,.01,5.5);
  box(48,.08,1.5,0xe8dcc2,world,0,0,-7.4);
  box(48,.08,.13,0xf8f4e9,world,0,.06,-6.6);
  const rotors=[];
  function turbine(x,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);world.add(g);
    cylinder(.8,.9,.25,0xd9d9cc,g,0,.125,0);
    cylinder(.26,.48,11.4,0xf9f7ef,g,0,5.8,0);
    cylinder(.52,.57,.25,0xd4d8d4,g,0,.34,0);
    const nacelle=box(.9,.9,1.7,0xf4f1e5,g,0,11.6,-.45);nacelle.rotation.x=.05;
    const rotor=new THREE.Group();rotor.position.set(0,11.6,.54);g.add(rotor);
    const hub=cylinder(.43,.37,.8,0xe5e8e2,rotor,0,0,0);hub.rotation.x=Math.PI/2;
    const cap=mesh(new THREE.SphereGeometry(.31,20,12),0xfcfaf1,rotor,0,0,.46);cap.scale.z=.65;
    for(let i=0;i<3;i++) {
      const blade=new THREE.Group();blade.rotation.z=i*Math.PI*2/3;rotor.add(blade);
      const shape=new THREE.Shape();shape.moveTo(-.13,.25);shape.bezierCurveTo(-.55,1.05,-.28,2.2,-.09,3.9);shape.lineTo(.015,4.8);shape.quadraticCurveTo(.14,4.98,.19,4.65);shape.lineTo(.29,1.35);shape.quadraticCurveTo(.28,.6,.13,.25);shape.closePath();
      const b=mesh(new THREE.ExtrudeGeometry(shape,{depth:.095,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025}),0xfbf9ee,blade,0,0,.12);
      const tipShape=new THREE.Shape();tipShape.moveTo(-.07,4.02);tipShape.lineTo(.018,4.8);tipShape.quadraticCurveTo(.14,4.98,.19,4.65);tipShape.lineTo(.22,4.02);tipShape.closePath();
      mesh(new THREE.ExtrudeGeometry(tipShape,{depth:.102,bevelEnabled:false}),0xff790a,blade,0,0,.16);
    }
    rotor.rotation.z=x*.18;rotors.push(rotor);
  }
  turbine(-15,-8,1);turbine(-3,-8,1.06);turbine(9,-8,1.12);turbine(21,-8,1);

  // Shared geometry keeps the many solar cells and leaves inexpensive to draw.
  const cellGeometry=new THREE.BoxGeometry(.75,.045,1.05);
  const cellMaterial=material(0x294b75,.45,.32);
  const cells=[];
  for(let row=0;row<3;row++) for(let col=0;col<8;col++) {
    const g=new THREE.Group();g.position.set(-21+col*5.9,.9,-4.7+row*2.6);world.add(g);
    for(const x of [-1.8,1.8]) {box(.09,1.2,.09,0x9b9e99,g,x,-.2,.3,.4);box(.12,.09,1.7,0xb0b5ad,g,x,-.55,0,.3);}
    const surface=new THREE.Group();surface.rotation.x=.33;g.add(surface);
    box(4.95,.07,2.27,0xc9d0d0,surface,0,0,0,.5);
    for(let a=0;a<6;a++) for(let b=0;b<2;b++) {
      const temp=new THREE.Object3D();temp.position.set(-2.02+a*.805,.065,-.56+b*1.12);surface.add(temp);cells.push(temp);
    }
    for(let a=0;a<6;a++) box(.017,.014,2.2,0x8ea9bd,surface,-2.02+a*.805,.096,0);
  }
  world.updateMatrixWorld(true);
  const panels=new THREE.InstancedMesh(cellGeometry,cellMaterial,cells.length);
  cells.forEach((c,i)=>panels.setMatrixAt(i,c.matrixWorld));panels.castShadow=true;panels.receiveShadow=true;scene.add(panels);
  let seed=79;
  function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  const leaves=[];const leafGeometry=new THREE.IcosahedronGeometry(1,1);
  function tree(x,z,s=1) {
    cylinder(.07*s,.14*s,1.5*s,0x77674a,world,x,.75*s,z);
    for(let i=0;i<13;i++){
      const o=new THREE.Object3D();o.position.set(x+(random()-.5)*1.15*s,(1.4+random()*1.45)*s,z+(random()-.5)*1.15*s);o.scale.set(.38*s+random()*.22*s,.42*s+random()*.27*s,.4*s);o.rotation.set(random()*3,random()*3,random()*3);o.updateMatrix();leaves.push({matrix:o.matrix,color:new THREE.Color([0x727b37,0x909340,0xa5a14a,0xb0a752,0x67713c][i%5])});
    }
  }
  for(let x=-23;x<25;x+=2.05){tree(x,-9.6,.7+random()*.34);if(x%3)tree(x,3.1,.43+random()*.25);}
  for(let z=-6;z<14;z+=2.1)tree(-23,z,.6+random()*.3);
  for(let x=-20;x<23;x+=3.3)tree(x,13,.65+random()*.3);
  const foliage=new THREE.InstancedMesh(leafGeometry,material(0xffffff),leaves.length);leaves.forEach((l,i)=>{foliage.setMatrixAt(i,l.matrix);foliage.setColorAt(i,l.color);});foliage.castShadow=true;foliage.receiveShadow=true;world.add(foliage);
  const building=new THREE.Group();building.position.set(-.7,0,10.6);world.add(building);
  box(9,4.3,5.3,0xe6e5dc,building,0,2.15,0);
  box(9.3,.18,5.6,0xf5f0df,building,0,4.36,0);
  box(5.4,3.2,.08,0x64706e,building,.7,1.61,2.7);
  for(let i=0;i<12;i++)box(5.3,.025,.04,0x8d9590,building,.7,.2+i*.25,2.77);
  for(const x of [-4,-2.8,3.8])box(.25,3.7,.2,0xf69721,building,x,2.08,2.75);
  for(const x of [-4.52])for(const z of [-1.4,.2,1.7])box(.08,1.9,.75,0x758b8b,building,x,2.6,z);
  for(let i=0;i<3;i++){
    const x=-2.8+i*2.7;
    box(1.7,1.2,1.65,0xc8ccc4,building,x,5.05,-.4);
    box(1.8,.1,1.75,0xf0eee4,building,x,5.7,-.4);
    const fan=cylinder(.49,.49,.05,0x5f6a67,building,x,5.77,-.4);
    for(let j=0;j<5;j++)box(1.3,.04,.035,0x8a9791,building,x,5.81,-.84+j*.22);
    box(.02,.64,.95,0x83908a,building,x+.86,5.04,-.4);
  }
  for(let x=-4.3;x<4.5;x+=.85){cylinder(.025,.025,.6,0x747e76,building,x,4.75,2.6);}
  box(8.8,.035,.04,0x6e7a71,building,0,5.05,2.6);
  function pipe(points,r=.13){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.05);return mesh(new THREE.TubeGeometry(curve,32,r,8,false),0xf28b19,world,0,0,0,.25);}
  for(let i=0;i<3;i++)pipe([[4.6+i*.5,.3,12.5],[4.6+i*.5,3.5,12.5],[4.6+i*.5,3.8,11.8],[4.6+i*.5,3.8,7.7],[6.5,3.8,7.4],[9.5,3.8,7.4],[10,3.4,7.4],[10,.4,7.4]]);
  for(let x=9;x<20;x+=3.1){cylinder(.95,.95,3.2,0xd4d9d1,world,x,1.7,10.5);cylinder(.96,.96,.13,0x82928a,world,x,3.24,10.5);box(1.7,.15,1.7,0xb5b9ae,world,x,.13,10.5);}
  for(let x=-21;x<24;x+=5.6){cylinder(.035,.05,2.3,0x959a88,world,x,1.2,4);box(.6,.09,.23,0xf3ad31,world,x+.22,2.38,4);}
  for(let x=-23;x<25;x+=1.3)cylinder(.025,.025,1,0x959f90,world,x,.5,-11.2);
  box(48,.025,.025,0x9ba799,world,0,.95,-11.2);box(48,.025,.025,0x9ba799,world,0,.43,-11.2);

  let alternate=false, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, speed=1, last=0;
  const target=new THREE.Vector3();
  function resize(){
    const width=container.clientWidth,height=container.clientHeight,mobile=width<930;
    // Keep the scene behind the plant area when cards stack below it.
    renderer.setSize(width,mobile?650:height,false);
    renderer.domElement.style.height=mobile?'650px':'100%';
    const aspect=width/(mobile?650:height),size=mobile?30:31;
    camera.left=-size*aspect/2;camera.right=size*aspect/2;camera.top=size/2;camera.bottom=-size/2;
    target.set(mobile?-6:8,mobile?7.2:7,0);
    camera.position.copy(target).add(new THREE.Vector3(alternate?-10:-21,17,34));camera.lookAt(target);camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);resize();
  renderer.setAnimationLoop(time=>{
    const delta=last?Math.min((time-last)/1000,.05):0;last=time;
    if(document.hidden)return;
    if(!paused&&!document.hidden)rotors.forEach((r,i)=>r.rotation.z-=delta*(.38+i*.025)*speed);
    renderer.render(scene,camera);
  });
  return { toggleCamera(){alternate=!alternate;resize();},setPaused(value){paused=value;},setSpeed(value){speed=value;},get paused(){return paused;} };
}
