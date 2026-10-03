import { ThemeRenderContext } from "../../types";
import { renderTallyQuadrants } from "./tallyQuadrants";
import { renderTallyTable } from "./tallyTable";
import { renderTallyFooterLeft } from "./tallyFooterLeft";
import { renderTallyFooterRight } from "./tallyFooterRight";

export * from "./constants";
export * from "./tallyQuadrants";
export * from "./tallyTable";
export * from "./tallyFooterLeft";
export * from "./tallyFooterRight";

export function renderTallyAccounting(ctx: ThemeRenderContext): void {
  const tallyMarginX = 10 * ctx.scale;
  const tallyMarginY = 10 * ctx.scale;

  // 1. Quadrants (header, company info, party metadata)
  const tableStartY = renderTallyQuadrants(ctx, tallyMarginX, tallyMarginY);

  // 2. Goods ledger table and continuation lines
  const { footerStartY, splitX } = renderTallyTable(ctx, tableStartY, tallyMarginX, tallyMarginY);

  // 3. Footer left column (words, bank/UPI, declaration, seal)
  renderTallyFooterLeft(ctx, footerStartY, splitX, tallyMarginX, tallyMarginY);

  // 4. Footer right column (financial summary, tax breakdown, signatory)
  renderTallyFooterRight(ctx, footerStartY, splitX, tallyMarginX, tallyMarginY);
}

export default renderTallyAccounting;
