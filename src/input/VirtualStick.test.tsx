import { fireEvent, render } from "@testing-library/react";
import { VirtualStick } from "./VirtualStick";

describe("VirtualStick", () => {
  it("normalizes pointer drags and caps diagonal magnitude", () => {
    const onVector = vi.fn();
    const view = render(<VirtualStick onVector={onVector} />);
    const stick = view.getByLabelText("Movement stick");
    vi.spyOn(stick, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100,
      x: 0, y: 0, toJSON: () => ({}),
    });

    fireEvent.pointerDown(stick, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(stick, { pointerId: 1, clientX: 100, clientY: 100 });

    const [x, y] = onVector.mock.calls.at(-1)!;
    expect(Math.hypot(x, y)).toBeCloseTo(1, 8);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
  });

  it("does not let a second pointer steal the stick and clears on cancellation", () => {
    const onVector = vi.fn();
    const view = render(<VirtualStick onVector={onVector} />);
    const stick = view.getByLabelText("Movement stick");
    vi.spyOn(stick, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100,
      x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.pointerDown(stick, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerDown(stick, { pointerId: 2, clientX: 80, clientY: 80 });
    fireEvent.pointerMove(stick, { pointerId: 2, clientX: 100, clientY: 100 });
    expect(onVector).toHaveBeenLastCalledWith(0, 0);

    fireEvent.pointerCancel(stick, { pointerId: 1 });
    expect(onVector).toHaveBeenLastCalledWith(0, 0);
  });

  it.each(["pointerUp", "lostPointerCapture"] as const)(
    "clears on %s and component unmount",
    (eventName) => {
      const onVector = vi.fn();
      const view = render(<VirtualStick onVector={onVector} />);
      const stick = view.getByLabelText("Movement stick");
      fireEvent.pointerDown(stick, { pointerId: 4, clientX: 10, clientY: 10 });
      fireEvent[eventName](stick, { pointerId: 4 });
      expect(onVector).toHaveBeenLastCalledWith(0, 0);
      view.unmount();
      expect(onVector).toHaveBeenLastCalledWith(0, 0);
    },
  );

  it("clears active touch input on window blur", () => {
    const onVector = vi.fn();
    const view = render(<VirtualStick onVector={onVector} />);
    const stick = view.getByLabelText("Movement stick");
    fireEvent.pointerDown(stick, { pointerId: 8, clientX: 20, clientY: 20 });
    fireEvent.blur(window);
    expect(onVector).toHaveBeenLastCalledWith(0, 0);
  });
});
