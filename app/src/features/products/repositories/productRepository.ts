import { BaseRepository } from "@/repositories/baseRepository";

// A placeholder for the Product entity type
export interface ProductEntity {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

class ProductRepository extends BaseRepository<ProductEntity> {
  constructor() {
    super("Product");
  }
}

export const productRepository = new ProductRepository();
