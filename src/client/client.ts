import * as THREE from "three";
import * as CCS from "./CyclidicCoordinateSystemScene";
import * as SCS from "./SingularityCurvesScene";

const renderer = new THREE.WebGLRenderer()
console.log('Max funiforms: ' + renderer.capabilities.maxFragmentUniforms)
console.log('Max vuniforms: ' + renderer.capabilities.maxVertexUniforms)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

let scene = CCS.CreateScene(renderer)
let camera = CCS.GetCamera()

function render() {
    renderer.render(scene, camera)
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
    CCS.OnWindowResize()
    render()
}

function animate() {
    requestAnimationFrame(animate)

    CCS.UpdateScene()

    render()
}

animate()