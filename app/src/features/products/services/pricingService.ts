/**
 * Service for calculating the price of 3D printing jobs.
 */
class PricingService {
  /**
   * Calculates the final price for a print batch based on a formula.
   *
   * @param materialCost - The total cost of the material (filament, resin).
   * @param printHours - The total hours the print job will take.
   * @param machineRate - The hourly rate for using the 3D printer.
   * @param operatorHours - The hours of manual operator labor.
   * @param operatorRate - The hourly rate for the operator.
   * @param markup - The percentage markup to apply (e.g., 0.2 for 20%).
   * @returns The final calculated price.
   */
  calculateFinalPrice({
    materialCost,
    printHours,
    machineRate,
    operatorHours,
    operatorRate,
    markup,
  }: {
    materialCost: number;
    printHours: number;
    machineRate: number;
    operatorHours: number;
    operatorRate: number;
    markup: number;
  }): number {
    if (
      materialCost < 0 ||
      printHours < 0 ||
      machineRate < 0 ||
      operatorHours < 0 ||
      operatorRate < 0 ||
      markup < 0
    ) {
      throw new Error("Pricing inputs cannot be negative.");
    }

    const batchCost =
      materialCost +
      printHours * machineRate +
      operatorHours * operatorRate;

    const finalPrice = batchCost * (1 + markup);

    // Return price rounded to 2 decimal places
    return Math.round(finalPrice * 100) / 100;
  }
}

export const pricingService = new PricingService();
