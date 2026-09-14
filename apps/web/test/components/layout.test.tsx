import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";

import "@/test/mocks/contexts";
import { mockAuth, mockChat, mockNotifications } from "@/test/mocks/contexts";
import { mockNextNavigation } from "@/test/mocks/navigation";
import { USER_ID } from "@/test/factories";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AuthLayout } from "@/components/layout/auth-layout";

describe("layout components", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
    mockChat.totalUnread = 0;
    mockNotifications.unreadCount = 0;
  });

  describe("Sidebar", () => {
    it("renders all nav links", () => {
      mockNextNavigation("/");
      render(<Sidebar />);
      for (const label of [
        "Feed",
        "Search",
        "Chat",
        "Notifications",
        "Profile",
        "Settings",
      ]) {
        expect(
          screen.getByRole("link", { name: new RegExp(label) }),
        ).toBeInTheDocument();
      }
    });

    it("marks the active nav item", () => {
      mockNextNavigation("/chat");
      render(<Sidebar />);
      const chatLink = screen.getByRole("link", { name: /Chat/ });
      expect(chatLink).toHaveAttribute("aria-current", "page");
      const feedLink = screen.getByRole("link", { name: /Feed/ });
      expect(feedLink).not.toHaveAttribute("aria-current");
    });

    it("shows unread badges for chat and notifications", () => {
      mockNextNavigation("/");
      mockChat.totalUnread = 3;
      mockNotifications.unreadCount = 5;
      render(<Sidebar />);
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("shows the signed-in user email and logs out", async () => {
      mockNextNavigation("/");
      const user = userEvent.setup();
      mockAuth.user = { userId: USER_ID, email: "user@test.local" };
      render(<Sidebar />);
      expect(screen.getByText("user@test.local")).toBeInTheDocument();
      const trigger = screen.getByRole("button", { name: "Account menu" });
      fireEvent.keyDown(trigger, { key: "Enter" });
      const item = await screen.findByRole("menuitem", { name: /Log out/ });
      fireEvent.click(item);
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe("DashboardLayout", () => {
    it("renders sidebar, mobile top bar and children", () => {
      mockNextNavigation("/");
      mockAuth.user = { userId: USER_ID, email: "user@test.local" };
      const { container } = render(
        <DashboardLayout>
          <p>page content</p>
        </DashboardLayout>,
      );
      expect(screen.getByText("page content")).toBeInTheDocument();
      expect(screen.getAllByText("Innogram").length).toBeGreaterThan(0);
      expect(container.querySelector("aside")).not.toBeNull();
      expect(container.querySelector("header")).not.toBeNull();
    });
  });

  describe("AuthLayout", () => {
    it("renders children without the sidebar chrome", () => {
      render(
        <AuthLayout>
          <p>login form</p>
        </AuthLayout>,
      );
      expect(screen.getByText("login form")).toBeInTheDocument();
      expect(screen.queryByText("Innogram")).not.toBeInTheDocument();
    });
  });
});
