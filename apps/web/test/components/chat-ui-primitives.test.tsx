import { render, screen } from "@testing-library/react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-kit/alert-dialog";
import { Badge } from "@/components/ui-kit/badge";
import { Button } from "@/components/ui-kit/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui-kit/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-kit/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui-kit/popover";
import { ScrollArea } from "@/components/ui-kit/scroll-area";
import { Separator } from "@/components/ui-kit/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui-kit/tooltip";

describe("chat-ui primitives", () => {
  it("Button renders with children", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("Badge renders text", () => {
    render(<Badge>ADMIN</Badge>);
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });

  it("Separator renders with separator role", () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("ScrollArea renders children", () => {
    render(
      <ScrollArea>
        <p>scrollable content</p>
      </ScrollArea>,
    );
    expect(screen.getByText("scrollable content")).toBeInTheDocument();
  });

  it("Tooltip renders trigger", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent>tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("hover me")).toBeInTheDocument();
  });

  it("Popover renders closed with trigger visible", () => {
    render(
      <Popover>
        <PopoverTrigger>open popover</PopoverTrigger>
        <PopoverContent>
          <p>popover body</p>
        </PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("open popover")).toBeInTheDocument();
    expect(screen.queryByText("popover body")).not.toBeInTheDocument();
  });

  it("Dialog renders closed with trigger visible", () => {
    render(
      <Dialog>
        <DialogTrigger>open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("open dialog")).toBeInTheDocument();
    expect(screen.queryByText("Dialog title")).not.toBeInTheDocument();
  });

  it("AlertDialog renders closed with trigger visible", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText("delete")).toBeInTheDocument();
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("DropdownMenu renders closed with trigger visible", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>action one</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText("menu")).toBeInTheDocument();
    expect(screen.queryByText("action one")).not.toBeInTheDocument();
  });

  it("Command renders input and list", () => {
    render(
      <Command>
        <CommandInput placeholder="Search users" />
        <CommandList>
          <CommandEmpty>No users found</CommandEmpty>
        </CommandList>
      </Command>,
    );
    expect(screen.getByPlaceholderText("Search users")).toBeInTheDocument();
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });
});
