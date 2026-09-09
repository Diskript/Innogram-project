import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

describe("ui primitives", () => {
  it("Button renders with children", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("Card renders title and description", () => {
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

  it("Avatar renders initials fallback without src", () => {
    render(<Avatar alt="Test User" />);
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("Input renders with placeholder", () => {
    render(<Input placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("Textarea renders with placeholder", () => {
    render(<Textarea placeholder="Write something" />);
    expect(screen.getByPlaceholderText("Write something")).toBeInTheDocument();
  });

  it("Select renders label and options", () => {
    render(
      <Select
        label="Visibility"
        value="PUBLIC"
        onChange={() => {}}
        options={[
          { value: "PUBLIC", label: "Public" },
          { value: "PRIVATE", label: "Private" },
        ]}
      />,
    );
    expect(screen.getByLabelText("Visibility")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Private" })).toBeInTheDocument();
  });

  it("Skeleton renders a placeholder element", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("Spinner renders an svg", () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("Switch reflects checked state", () => {
    render(<Switch checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("Switch calls onCheckedChange on click", async () => {
    const onCheckedChange = jest.fn();
    const user = userEvent.setup();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("EmptyState renders icon, title and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nothing here"
        description="Come back later"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Come back later")).toBeInTheDocument();
  });
});
