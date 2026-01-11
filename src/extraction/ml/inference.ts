/**
 * ML inference for element classification.
 * Loads trained model and makes predictions on DOM elements.
 */

import modelData from './model.json';
import type { FeatureVector, MLInferenceResult } from './types';

interface ThresholdModel {
  type: 'threshold';
  version: string;
  thresholds: {
    [key: string]: {
      keepThreshold: number;
      removeThreshold: number;
    };
  };
  featureWeights: {
    [key: string]: number;
  };
  defaultKeep: boolean;
}

let cachedModel: ThresholdModel | null = null;

function loadModel(): ThresholdModel {
  if (!cachedModel) {
    cachedModel = modelData as ThresholdModel;
  }
  return cachedModel;
}

/**
 * Predict whether an element should be kept or removed using threshold-based model.
 * 
 * @param features - Feature vector extracted from element
 * @returns Prediction result with keep/remove decision and confidence
 */
export function shouldKeepElement(features: FeatureVector): MLInferenceResult {
  const model = loadModel();
  
  let keepScore = 0;
  let removeScore = 0;
  let totalWeight = 0;
  
  for (const [featureName, weight] of Object.entries(model.featureWeights)) {
    const featureValue = features[featureName as keyof FeatureVector] as number;
    const threshold = model.thresholds[featureName];
    
    if (!threshold || weight === 0) continue;
    
    const keepDistance = Math.abs(featureValue - threshold.keepThreshold);
    const removeDistance = Math.abs(featureValue - threshold.removeThreshold);
    
    if (keepDistance < removeDistance) {
      keepScore += weight;
    } else {
      removeScore += weight;
    }
    totalWeight += weight;
  }
  
  if (totalWeight === 0) {
    return {
      keep: model.defaultKeep,
      confidence: 0.5,
    };
  }
  
  const keepRatio = keepScore / totalWeight;
  const removeRatio = removeScore / totalWeight;
  const keep = keepScore > removeScore;
  const confidence = keep ? keepRatio : removeRatio;
  
  return {
    keep,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

