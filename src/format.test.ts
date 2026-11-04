import { expect, test } from "vitest";
import { visibleUntil } from "./format";
test("replay does not reveal future executions", () => {
  const trades = [{ date: "2020-01-02" }, { date: "2020-02-03" }];
  expect(visibleUntil(trades, "2020-01-15")).toEqual([trades[0]]);
  expect(visibleUntil(trades, "2019-01-01")).toEqual([]);
});
