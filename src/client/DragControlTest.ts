import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TubeMesh } from "./line/lineMesh";
import { DragControls, DragObject } from "./input/DragControls";
import { LineMeshShaderGenerator } from "./shaders/lineMeshShader";

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = -5
camera.position.y = 3

const axesHelper = new THREE.AxesHelper( 1 )
scene.add( axesHelper )

let orbitControls: OrbitControls;
let dragControls: DragControls

const dragSphere = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)))

dragSphere.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newX = position.x > 0 ? Math.min(1, position.x) : Math.max(-1, position.x)
    const newZ = 0
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

const dragSphere2 = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)))

dragSphere2.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newX = 0
    const newZ = position.z > 0 ? Math.min(1, position.z) : Math.max(-1, position.z)
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

scene.add(dragSphere.sceneObject)
scene.add(dragSphere2.sceneObject)

const n = 1000;
let pList: Array<THREE.Vector3> = [];
for(let i = 0; i < n ; i ++) {
    pList.push(
        new THREE.Vector3(
            Math.sin(i / n * Math.PI * 2) * 2,
            0,
            Math.cos(i / n * Math.PI * 2) * 2
    ))
}

const tube = new TubeMesh(12, 1000, true)
tube.SetPoints(pList)

scene.add(tube.CreateMesh())

export function OnWindowResize() {
}

export function UpdateScene() {
    orbitControls.update()
    orbitControls.enablePan = false
}

export function CreateScene(renderer: THREE.WebGLRenderer): THREE.Scene
{
    orbitControls = new OrbitControls(camera, renderer.domElement)
    dragControls = new DragControls([dragSphere, dragSphere2], camera, renderer.domElement, orbitControls)
    return scene
}

export function GetCamera(): THREE.PerspectiveCamera 
{
    return camera
}