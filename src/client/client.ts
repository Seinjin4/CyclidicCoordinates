import * as THREE from "three";
import * as CCS from "./CyclidicCoordinateSystemScene";
import * as CCS2 from "./CyclidicCoordinateSystemScene2";
import * as DTS from "./DragControlTest"
import * as TS from "./TestScene"

const renderer = new THREE.WebGLRenderer()

renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

let scene = CCS2.CreateScene(renderer)
let camera = CCS2.GetCamera()

function render() {
    renderer.render(scene, camera)
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
    CCS2.OnWindowResize()
    render()
}

function animate() {
    requestAnimationFrame(animate)

    CCS2.UpdateScene()

    render()
}

animate()