export interface SlicerMetadata {
  estimatedTime: number; // in seconds
  materialGrams: number;
  filamentLength: number; // in mm
  layerCount: number;
  infillPercent: number;
  boundingBox: string;
  supportUsage: boolean;
  rawLog: string;
}

export interface SlicerAdapter {
  slice(stlFilePath: string): Promise<SlicerMetadata>;
}
