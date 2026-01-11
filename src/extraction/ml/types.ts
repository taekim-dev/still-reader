/**
 * Feature vector extracted from a DOM element for ML classification.
 * All numeric features are normalized to [0, 1] range for better ML performance.
 */
export interface FeatureVector {
  // Structural features (normalized)
  tagNameEncoded: number; // One-hot encoded common tags (div=0, p=1, article=2, etc.)
  depth: number; // Normalized depth (0-1, max depth = 20)
  childCount: number; // Normalized child count (0-1, max = 100)
  siblingCount: number; // Normalized sibling count (0-1, max = 50)
  
  // Content features (normalized)
  textLength: number; // Normalized text length (0-1, max = 10000 chars)
  paragraphCount: number; // Normalized paragraph count (0-1, max = 50)
  linkCount: number; // Normalized link count (0-1, max = 100)
  linkRatio: number; // Link text length / total text length (0-1)
  imageCount: number; // Normalized image count (0-1, max = 20)
  
  // Semantic features (binary)
  hasHeading: number; // 1 if has h1-h6, 0 otherwise
  hasSemanticTag: number; // 1 if article/main/section, 0 otherwise
  hasList: number; // 1 if has ul/ol, 0 otherwise
  
  // Pattern features (binary indicators)
  hasNavPattern: number; // 1 if matches nav patterns, 0 otherwise
  hasAdPattern: number; // 1 if matches ad patterns, 0 otherwise
  hasFooterPattern: number; // 1 if matches footer patterns, 0 otherwise
  hasRelatedPattern: number; // 1 if matches related content patterns, 0 otherwise
  hasVideoPattern: number; // 1 if matches video patterns, 0 otherwise
  hasMetaPattern: number; // 1 if matches meta patterns, 0 otherwise
  hasAuthorPattern: number; // 1 if matches author patterns, 0 otherwise
  
  // Context features (normalized)
  parentTagNameEncoded: number; // One-hot encoded parent tag
  positionInParent: number; // Normalized position (0-1)
  isFirstChild: number; // 1 if first child, 0 otherwise
  isLastChild: number; // 1 if last child, 0 otherwise
  
  // Additional features
  hasDataAttributes: number; // 1 if has data-* attributes, 0 otherwise
  hasAriaAttributes: number; // 1 if has aria-* attributes, 0 otherwise
  classNameLength: number; // Normalized class name length (0-1, max = 200 chars)
  idLength: number; // Normalized ID length (0-1, max = 100 chars)
}

export interface MLInferenceResult {
  keep: boolean;
  confidence: number;
}

