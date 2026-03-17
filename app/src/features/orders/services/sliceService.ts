import { SlicerAdapter } from "@/lib/slicer/slicerAdapter";
import { MockSlicerAdapter } from "@/lib/slicer/mockSlicerAdapter";
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

class SliceService {
  private slicer: SlicerAdapter;

  constructor(slicer: SlicerAdapter) {
    this.slicer = slicer;
  }

  async processStlUrl(url: string): Promise<any> {
    console.log(`[SliceService] Processing STL from URL: ${url}`);
    
    // 1. Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}. Status: ${response.status}`);
    }
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    // 2. Store temporarily
    const tempDir = path.join(tmpdir(), 'play3d-uploads');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `slice-${Date.now()}.stl`);
    await fs.writeFile(tempFilePath, fileBuffer);
    console.log(`[SliceService] File saved temporarily to ${tempFilePath}`);

    // 3. Send to slicer service (adapter)
    const metadata = await this.slicer.slice(tempFilePath);

    // 4. Clean up temporary file
    await fs.unlink(tempFilePath);
    console.log(`[SliceService] Cleaned up temporary file: ${tempFilePath}`);

    // 5. Return metadata
    return metadata;
  }
}

// In a real dependency injection setup, the adapter would be injected.
// Here, we instantiate it directly.
const slicerAdapter = new MockSlicerAdapter();
export const sliceService = new SliceService(slicerAdapter);
