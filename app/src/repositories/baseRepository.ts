// NOTE: This is a mocked implementation due to the Prisma setup issue.
// Once Prisma is working, this will be connected to the actual Prisma client.

/**
 * A generic BaseRepository class for common CRUD operations.
 * This class is intended to be extended by feature-specific repositories.
 *
 * @template T - The Prisma model type (e.g., User, Order).
 */
export abstract class BaseRepository<T> {
  protected modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    console.log(`Mock ${modelName}Repository initialized.`);
  }

  // A mock store for demonstration purposes
  protected mockStore: Map<string, T> = new Map();
  private idCounter = 0;

  async create(data: Partial<T>): Promise<T> {
    const id = String(++this.idCounter);
    const newRecord = { ...data, id, createdAt: new Date(), updatedAt: new Date() } as T;
    this.mockStore.set(id, newRecord);
    console.log(`[Mock DB] Created ${this.modelName}:`, newRecord);
    return newRecord;
  }

  async findById(id: string): Promise<T | null> {
    const record = this.mockStore.get(id) || null;
    console.log(`[Mock DB] Found ${this.modelName} by ID ${id}:`, record);
    return record;
  }

  async findMany(filter: any = {}): Promise<T[]> {
    // Basic filtering for mock purposes
    const records = Array.from(this.mockStore.values()).filter(item => {
      return Object.keys(filter).every(key => (item as any)[key] === filter[key]);
    });
    console.log(`[Mock DB] Found many ${this.modelName} with filter:`, filter, records);
    return records;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.mockStore.get(id);
    if (!existing) {
      return null;
    }
    const updatedRecord = { ...existing, ...data, updatedAt: new Date() };
    this.mockStore.set(id, updatedRecord);
    console.log(`[Mock DB] Updated ${this.modelName} ${id}:`, updatedRecord);
    return updatedRecord;
  }

  async delete(id: string): Promise<T | null> {
    const existing = this.mockStore.get(id);
    if (!existing) {
      return null;
    }
    this.mockStore.delete(id);
    console.log(`[Mock DB] Deleted ${this.modelName} ${id}`);
    return existing;
  }
}
