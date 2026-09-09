import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui-kit/avatar";
import { Button } from "@/components/ui-kit/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui-kit/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui-kit/empty";
import { Input } from "@/components/ui-kit/input";
import { Label } from "@/components/ui-kit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-kit/select";
import { Skeleton } from "@/components/ui-kit/skeleton";
import { Spinner } from "@/components/ui-kit/spinner";
import { Switch } from "@/components/ui-kit/switch";
import { Textarea } from "@/components/ui-kit/textarea";

// jsdom (jest 29) lacks the pointer-capture APIs Radix Select calls in its
// trigger/item pointerdown handlers, and scrollIntoView used when opening.
if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

describe("ui-kit primitives", () => {
  describe("Button", () => {
    it("renders with children", () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole("button", { name: "Click me" }),
      ).toBeInTheDocument();
    });

    it("exposes variant and disabled state", () => {
      render(
        <Button variant="destructive" disabled>
          Delete
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Delete" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("data-variant", "destructive");
    });
  });

  describe("Card", () => {
    it("renders title and description", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
        </Card>,
      );
      expect(screen.getByText("Card title")).toBeInTheDocument();
      expect(screen.getByText("Card description")).toBeInTheDocument();
    });
  });

  describe("Avatar", () => {
    it("renders initials fallback when no image is given", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>TU</AvatarFallback>
        </Avatar>,
      );
      expect(screen.getByText("TU")).toBeInTheDocument();
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });
  });

  describe("Input", () => {
    it("pairs with Label and surfaces an error", () => {
      render(
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="you@example.com" aria-invalid={true} />
          <p>Email is required</p>
        </div>,
      );
      const input = screen.getByLabelText("Email");
      expect(input).toHaveAttribute("placeholder", "you@example.com");
      expect(input).toBeInvalid();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });
  });

  describe("Textarea", () => {
    it("renders with placeholder", () => {
      render(<Textarea placeholder="Write something" />);
      expect(
        screen.getByPlaceholderText("Write something"),
      ).toBeInTheDocument();
    });
  });

  describe("Select", () => {
    it("renders a closed combobox trigger", () => {
      render(
        <Select defaultValue="PUBLIC">
          <SelectTrigger aria-label="Visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(
        screen.getByRole("combobox", { name: "Visibility" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
    });

    it("opens a portal, selects an option and calls onValueChange", async () => {
      const onValueChange = jest.fn();
      const user = userEvent.setup();
      render(
        <Select defaultValue="PUBLIC" onValueChange={onValueChange}>
          <SelectTrigger aria-label="Visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>,
      );
      // Radix hides the trigger from the a11y tree while the listbox is open,
      // so capture the node while closed and reuse it for attribute checks.
      const trigger = screen.getByRole("combobox", { name: "Visibility" });
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      await user.click(screen.getByRole("option", { name: "Private" }));
      expect(onValueChange).toHaveBeenCalledWith("PRIVATE");
      await waitFor(() => {
        expect(screen.queryByRole("option")).not.toBeInTheDocument();
      });
    });
  });

  describe("Skeleton", () => {
    it("renders an animated placeholder element", () => {
      const { container } = render(<Skeleton className="h-4 w-40" />);
      expect(container.firstElementChild).toBeInTheDocument();
      expect(container.firstElementChild).toHaveClass("animate-pulse");
    });
  });

  describe("Spinner", () => {
    it("renders a loading status indicator", () => {
      const { container } = render(<Spinner className="size-6" />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Loading",
      );
      expect(screen.getByRole("status")).toHaveClass("size-6");
    });
  });

  describe("Switch", () => {
    it("reflects checked state", () => {
      render(<Switch checked={true} onCheckedChange={() => {}} />);
      expect(screen.getByRole("switch")).toBeChecked();
    });

    it("calls onCheckedChange on click", async () => {
      const onCheckedChange = jest.fn();
      const user = userEvent.setup();
      render(<Switch checked={false} onCheckedChange={onCheckedChange} />);
      await user.click(screen.getByRole("switch"));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Empty", () => {
    it("renders icon, title and description", () => {
      const { container } = render(
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>Come back later</EmptyDescription>
          </EmptyHeader>
        </Empty>,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
      expect(screen.getByText("Come back later")).toBeInTheDocument();
    });
  });
});
