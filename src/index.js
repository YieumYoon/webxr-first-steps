/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Text } from 'troika-three-text';
import { XR_BUTTONS } from 'gamepad-wrapper';
import { gsap } from 'gsap';
import { init } from './init.js';



const bulletGeometry = new THREE.SphereGeometry(0.02);
const bulletMaterial = new THREE.MeshStandardMaterial({ color: 'gray' });
const bulletPrototype = new THREE.Mesh(bulletGeometry, bulletMaterial);

const bullets = {};
const forwardVector = new THREE.Vector3(0, 0, -1);
const bulletSpeed = 10;
const bulletTimeToLive = 1;

// Tutorial Chapter 4: Replacing Basic Objects with GLTF Models
const rightBlasterGroup = new THREE.Group();
const leftBlasterGroup = new THREE.Group();
const targets = []; 

// Tutorial Chapter 5: Adding a Score Display
let score = 0;
const scoreText = new Text();
scoreText.fontSize = 0.52;
scoreText.font = 'assets/SpaceMono-Bold.ttf';
scoreText.position.z = -2;
scoreText.color = "0xffa276";
scoreText.anchorX = 'center';
scoreText.anchorY = 'middle';

// Tutorial Chapter 6: Finishing Touches
let rightLaserSound, leftLaserSound, scoreSound;

// Tutorial Chapter 5: Adding a Score Display
function updateScoreDisplay() {
	const clampedScore = Math.max(0, Math.min(9999, score));
	const displayScore = clampedScore.toString().padStart(4, '0');
	scoreText.text = displayScore;
	scoreText.sync();
}

function setupScene({ scene, camera, renderer, player, controllers }) {
	
	// const floorGeometry = new THREE.PlaneGeometry(6, 6);
	// const floorMaterial = new THREE.MeshStandardMaterial({ color: 'white' });
	// const floor = new THREE.Mesh(floorGeometry, floorMaterial);
	// scene.add(floor);
	// floor.rotateX(-Math.PI / 2);

	// const coneGeometry = new THREE.ConeGeometry(0.6, 1.5);
	// const coneMaterial = new THREE.MeshStandardMaterial({ color: 'purple' });
	// const cone = new THREE.Mesh(coneGeometry, coneMaterial);
	// scene.add(cone);
	// cone.position.set(0.4, 0.75, -1.5);

	// const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	// const cubeMaterial = new THREE.MeshStandardMaterial({ color: 'orange' });
	// const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
	// scene.add(cube);
	// cube.position.set(-0.8, 0.5, -1.5);
	// cube.rotateY(Math.PI / 4);

	// const sphereGeometry = new THREE.SphereGeometry(0.4);
	// const sphereMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
	// const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
	// scene.add(sphere);
	// sphere.position.set(0.6, 0.4, -0.5);
	// sphere.scale.set(1.2, 1.2, 1.2);

	// Tutorial Chapter 4: Replacing Basic Objects with GLTF Models
	const gltfLoader = new GLTFLoader();
	gltfLoader.load('assets/spacestation.glb', (gltf) => {
		scene.add(gltf.scene);
	});
	gltfLoader.load('assets/blaster.glb', (gltf) => {
		rightBlasterGroup.add(gltf.scene);
	});
	gltfLoader.load('assets/blaster.glb', (gltf) => {
		leftBlasterGroup.add(gltf.scene);
	});
	gltfLoader.load('assets/target.glb', (gltf) => {
		for (let i = 0; i < 3; i++) {
			const target = gltf.scene.clone();
			target.position.set(
				Math.random() * 10 - 5,
				i * 2 + 1,
				-Math.random() * 5 - 5,
			);
			scene.add(target);
			targets.push(target);
		}
	});

	// Tutorial Chapter 5: Adding a Score Display

	scene.add(scoreText);
	scoreText.position.set(0, 0.67, -1.44);
	scoreText.rotateX(-Math.PI / 3.3);
	updateScoreDisplay();

	// Tutorial Chapter 6: Finishing Touches

	// Load and set up positional audio
	const listener = new THREE.AudioListener();
	camera.add(listener);

	// laser sound
	const audioLoader = new THREE.AudioLoader();
	rightLaserSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/laser.ogg', (buffer) => {
		rightLaserSound.setBuffer(buffer);
		rightBlasterGroup.add(rightLaserSound);
	});
	leftLaserSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/laser.ogg', (buffer) => {
		leftLaserSound.setBuffer(buffer);
		leftBlasterGroup.add(leftLaserSound);
	});

	// score sound
	scoreSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/score.ogg', (buffer) => {
		scoreSound.setBuffer(buffer);
		scoreText.add(scoreSound);
	});
}

function fireBullet(scene, raySpace, blasterGroup, laserSound, gamepad) {
	const bulletPrototype = blasterGroup.getObjectByName('bullet');
	if (bulletPrototype) {
		const bullet = bulletPrototype.clone();
		scene.add(bullet);
		raySpace.getWorldPosition(bullet.position);
		raySpace.getWorldQuaternion(bullet.quaternion);

		const directionVector = forwardVector
			.clone()
			.applyQuaternion(bullet.quaternion);
		bullet.userData = {
			velocity: directionVector.multiplyScalar(bulletSpeed),
			timeToLive: bulletTimeToLive,
		};
		bullets[bullet.uuid] = bullet;

		// Play laser sound
		if (laserSound.isPlaying) laserSound.stop();
		laserSound.play();

		// Haptic feedback
		try {
			gamepad.getHapticActuator(0).pulse(0.6, 100);
		} catch {
			// haptic feedback not supported on this controller
		}
	}
}

function onFrame( delta, time, { scene, camera, renderer, player, controllers }) {
	if (controllers.right) {
		const {gamepad, raySpace, mesh} = controllers.right;

		// Chapter 4: Attaching the Blaster to the Controller
		if (!raySpace.children.includes(rightBlasterGroup)) {
			raySpace.add(rightBlasterGroup);
			mesh.visible = false; // Hide the default controller model
		}

		if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
			fireBullet(scene, raySpace, rightBlasterGroup, rightLaserSound, gamepad);
		}
	}

	// Handle left controller
	if (controllers.left) {
		const {gamepad, raySpace, mesh} = controllers.left;

		// Attach the left blaster to the controller
		if (!raySpace.children.includes(leftBlasterGroup)) {
			raySpace.add(leftBlasterGroup);
			mesh.visible = false; // Hide the default controller model
		}

		if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
			fireBullet(scene, raySpace, leftBlasterGroup, leftLaserSound, gamepad);
		}
	}

	Object.values(bullets).forEach((bullet) => {
		if (bullet.userData.timeToLive < 0) {
			delete bullets[bullet.uuid];
			scene.remove(bullet);
			return;
		}
		const deltaVec = bullet.userData.velocity.clone().multiplyScalar(delta);
		bullet.position.add(deltaVec);
		bullet.userData.timeToLive -= delta;
		targets
		.filter((target) => target.visible)
		.forEach((target) => {
			const distance = target.position.distanceTo(bullet.position);
			if (distance < 1) {
				delete bullets[bullet.uuid];
				scene.remove(bullet);
				// make target disappear, and then reappear at a different place after 2 seconds
				// target.visible = false;
				// setTimeout(() => {
				// 	target.visible = true;
				// 	target.position.x = Math.random() * 10 - 5;
				// 	target.position.z = -Math.random() * 5 - 5;
				// }, 2000);
				// Tutorial Chapter 6: Finishing Touches
				score += 10; // Update the score when a target is hit
				updateScoreDisplay(); // Update the rendered troika-three-text object
				// Tutorial Chapter 6: Finishing Touches
				gsap.to(target.scale, {
					duration: 0.3,
					x: 0,
					y: 0,
					z: 0,
					onComplete: () => {
						target.visible = false;
						setTimeout(() => {
							target.visible = true;
							target.position.x = Math.random() * 10 - 5;
							target.position.z = -Math.random() * 5 - 5;
				
							// Scale back up the target
							gsap.to(target.scale, {
								duration: 0.3,
								x: 1,
								y: 1,
								z: 1,
							});
						}, 1000);
					},
				});
				if (scoreSound.isPlaying) scoreSound.stop();
				scoreSound.play();
			}
		});
	});
	
	gsap.ticker.tick(delta);
}

init(setupScene, onFrame);
