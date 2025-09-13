// Utility functions for model processing
import * as THREE from "three";

/**
 * Check if an object is a joint/bone that should be hidden from hierarchy
 */
export function isJoint(obj: THREE.Object3D): boolean {
  // Check if it's a THREE.Bone
  if (obj.type === 'Bone') {
    return true;
  }
  
  // Check if the name suggests it's a joint/bone
  const name = obj.name.toLowerCase();
  const jointKeywords = ['joint', 'bone', 'pelvis', 'torso', 'hip', 'knee', 'foot', 'chest', 'head', 'shoulder', 'elbow', 'hand'];
  
  // If the name contains any joint keywords, it's likely a joint
  if (jointKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  // If it has no mesh children but has transform data, it might be a joint
  if (obj.children.length > 0 && !obj.children.some(child => child instanceof THREE.Mesh)) {
    const hasOnlyJointChildren = obj.children.every(child => isJoint(child));
    if (hasOnlyJointChildren) {
      return true;
    }
  }
  
  return false;
}