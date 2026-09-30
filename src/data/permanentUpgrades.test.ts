import {
  permanentUpgradeCost,
  purchasePermanentUpgrade,
} from "./permanentUpgrades";
import { createDefaultSave } from "../save/SaveSchema";

describe("permanent upgrades", () => {
  it("uses rounded BaseCost * 1.75^level costs and subtracts once", () => {
    expect(permanentUpgradeCost("drill_power", 0)).toBe(10);
    expect(permanentUpgradeCost("drill_power", 1)).toBe(18);
    const save = { ...createDefaultSave(), credits: 30 };
    const purchased = purchasePermanentUpgrade(save, "drill_power");
    expect(purchased).toMatchObject({ accepted: true, cost: 10 });
    expect(purchased.data).toMatchObject({ credits: 20, upgrades: { drill_power: 1 } });
    expect(save.credits).toBe(30);
  });

  it("rejects unaffordable and capped upgrades", () => {
    const poor = purchasePermanentUpgrade(createDefaultSave(), "drill_power");
    expect(poor.accepted).toBe(false);
    const capped = purchasePermanentUpgrade(
      { ...createDefaultSave(), credits: 99_999, upgrades: { drill_power: 20 } },
      "drill_power",
    );
    expect(capped).toMatchObject({ accepted: false, reason: "MAX_LEVEL" });
  });
});
