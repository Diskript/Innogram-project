import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "@/test/mocks/contexts";
import { mockAuth } from "@/test/mocks/contexts";
import { renderWithProviders } from "@/test/render-with-providers";
import {
  makeComment,
  makePost,
  OTHER_USER_ID,
  USER_ID,
} from "@/test/factories";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import { CommentsSection } from "@/components/posts/comments";
import { MediaGallery } from "@/components/posts/media-gallery";
import { FeedToolbar } from "@/components/posts/feed-toolbar";
import {
  createComment,
  createPost,
  deletePost,
  getComments,
  toggleCommentLike,
  togglePostLike,
} from "@/lib/posts";
import { getAssetBlobUrl } from "@/lib/media";

jest.mock("@/lib/posts", () => ({
  togglePostLike: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  createPost: jest.fn(),
  uploadAssets: jest.fn(),
  getComments: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  toggleCommentLike: jest.fn(),
}));

jest.mock("@/lib/social", () => ({
  searchUsers: jest.fn(),
}));

jest.mock("@/lib/media", () => ({
  getAssetBlobUrl: jest.fn(),
}));

describe("posts components", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
  });

  describe("PostCard", () => {
    it("renders author, content and counters", () => {
      mockAuth.user = { userId: OTHER_USER_ID, email: "other@test.local" };
      renderWithProviders(
        <PostCard
          post={makePost({ _count: { postLikes: 4, comments: 2 } })}
          queryKey={["feed"]}
        />,
      );
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("Hello world")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("hides the actions menu for other users' posts", () => {
      mockAuth.user = { userId: OTHER_USER_ID, email: "other@test.local" };
      renderWithProviders(<PostCard post={makePost()} queryKey={["feed"]} />);
      expect(
        screen.queryByRole("button", { name: "Post actions" }),
      ).not.toBeInTheDocument();
    });

    it("calls togglePostLike when the like button is clicked", async () => {
      mockAuth.user = { userId: OTHER_USER_ID, email: "other@test.local" };
      const user = userEvent.setup();
      renderWithProviders(<PostCard post={makePost()} queryKey={["feed"]} />);
      await user.click(screen.getByRole("button", { name: /0/ }));
      expect(togglePostLike).toHaveBeenCalledWith("post-1");
    });

    it("shows the edit/delete menu for own posts", async () => {
      mockAuth.user = { userId: USER_ID, email: "user@test.local" };
      const user = userEvent.setup();
      renderWithProviders(<PostCard post={makePost()} queryKey={["feed"]} />);
      await user.click(screen.getByRole("button", { name: "Post actions" }));
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("deletes own post after confirmation", async () => {
      mockAuth.user = { userId: USER_ID, email: "user@test.local" };
      const user = userEvent.setup();
      renderWithProviders(<PostCard post={makePost()} queryKey={["feed"]} />);
      await user.click(screen.getByRole("button", { name: "Post actions" }));
      await user.click(screen.getByText("Delete"));
      expect(
        screen.getByText("Delete this post permanently?"),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Delete" }));
      expect(deletePost).toHaveBeenCalledWith("post-1");
    });

    it("renders media from the post assets", async () => {
      mockAuth.user = { userId: OTHER_USER_ID, email: "other@test.local" };
      jest.mocked(getAssetBlobUrl).mockResolvedValue("blob:mock-url");
      renderWithProviders(
        <PostCard
          post={makePost({
            postsAssets: [
              {
                orderIndex: 0,
                asset: {
                  id: "asset-1",
                  filePath: "uploads/a.png",
                  thumbnailPath: null,
                  mediumPath: null,
                  fileType: "image/png",
                  width: 800,
                  height: 600,
                },
              },
            ],
          })}
          queryKey={["feed"]}
        />,
      );
      expect(await screen.findByAltText("post media")).toBeInTheDocument();
      expect(getAssetBlobUrl).toHaveBeenCalledWith("asset-1");
    });

    it("renders no media when the post has no assets", () => {
      mockAuth.user = { userId: OTHER_USER_ID, email: "other@test.local" };
      renderWithProviders(<PostCard post={makePost()} queryKey={["feed"]} />);
      expect(screen.queryByAltText("post media")).not.toBeInTheDocument();
    });
  });

  describe("PostComposer", () => {
    it("disables the Post button when empty", () => {
      renderWithProviders(<PostComposer queryKey={["feed"]} />);
      expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    });

    it("submits content and visibility", async () => {
      jest.mocked(createPost).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<PostComposer queryKey={["feed"]} />);
      await user.type(
        screen.getByPlaceholderText("Share something with the community..."),
        "my first post",
      );
      await user.click(screen.getByRole("button", { name: "Post" }));
      expect(createPost).toHaveBeenCalledWith({
        content: "my first post",
        visibility: "PUBLIC",
        assetIds: [],
      });
    });

    it("passes the selected visibility", async () => {
      jest.mocked(createPost).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<PostComposer queryKey={["feed"]} />);
      await user.type(
        screen.getByPlaceholderText("Share something with the community..."),
        "private note",
      );
      await user.selectOptions(screen.getByRole("combobox"), "FOLLOWERS");
      await user.click(screen.getByRole("button", { name: "Post" }));
      expect(createPost).toHaveBeenCalledWith({
        content: "private note",
        visibility: "FOLLOWERS",
        assetIds: [],
      });
    });
  });

  describe("CommentsSection", () => {
    it("shows the empty state when there are no comments", async () => {
      jest.mocked(getComments).mockResolvedValue({
        data: [],
        total: 0,
        skip: 0,
        take: 10,
      });
      renderWithProviders(<CommentsSection postId="post-1" />);
      expect(await screen.findByText("No comments yet")).toBeInTheDocument();
    });

    it("renders comments with author and content", async () => {
      jest.mocked(getComments).mockResolvedValue({
        data: [makeComment()],
        total: 1,
        skip: 0,
        take: 10,
      });
      renderWithProviders(<CommentsSection postId="post-1" />);
      expect(await screen.findByText("Other User")).toBeInTheDocument();
      expect(screen.getByText("Nice post")).toBeInTheDocument();
    });

    it("submits a new comment", async () => {
      jest.mocked(getComments).mockResolvedValue({
        data: [],
        total: 0,
        skip: 0,
        take: 10,
      });
      jest.mocked(createComment).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<CommentsSection postId="post-1" />);
      await screen.findByText("No comments yet");
      await user.type(
        screen.getByPlaceholderText("Add a comment..."),
        "my comment",
      );
      await user.click(screen.getByRole("button", { name: "Comment" }));
      expect(createComment).toHaveBeenCalledWith("post-1", {
        content: "my comment",
      });
    });

    it("likes an existing comment", async () => {
      mockAuth.user = { userId: USER_ID, email: "user@test.local" };
      jest.mocked(getComments).mockResolvedValue({
        data: [makeComment({ userId: USER_ID })],
        total: 1,
        skip: 0,
        take: 10,
      });
      jest.mocked(toggleCommentLike).mockResolvedValue({} as never);
      const user = userEvent.setup();
      renderWithProviders(<CommentsSection postId="post-1" />);
      const likeButton = await screen.findByRole("button", {
        name: /0/,
      });
      await user.click(likeButton);
      expect(toggleCommentLike).toHaveBeenCalledWith("comment-1");
    });
  });

  describe("MediaGallery", () => {
    const imageAsset = {
      orderIndex: 0,
      asset: {
        id: "asset-1",
        filePath: "uploads/a.png",
        thumbnailPath: null,
        mediumPath: null,
        fileType: "image/png",
        width: 800,
        height: 600,
      },
    };

    const videoAsset = {
      orderIndex: 0,
      asset: {
        id: "asset-2",
        filePath: "uploads/v.mp4",
        thumbnailPath: null,
        mediumPath: null,
        fileType: "video/mp4",
        width: null,
        height: null,
      },
    };

    it("renders nothing without assets", () => {
      const { container } = renderWithProviders(<MediaGallery assets={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders an image once the blob url resolves", async () => {
      jest.mocked(getAssetBlobUrl).mockResolvedValue("blob:mock-url");
      renderWithProviders(<MediaGallery assets={[imageAsset]} />);
      expect(await screen.findByAltText("post media")).toBeInTheDocument();
    });

    it("renders a video element for video assets", async () => {
      jest.mocked(getAssetBlobUrl).mockResolvedValue("blob:mock-url");
      const { container } = renderWithProviders(
        <MediaGallery assets={[videoAsset]} />,
      );
      await screen.findByAltText("post media").catch(() => {
        // video renders a <video>, not an img
      });
      expect(container.querySelector("video")).toBeInTheDocument();
    });
  });

  describe("FeedToolbar", () => {
    it("emits sort and filter changes", async () => {
      const setSort = jest.fn();
      const setFilter = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(
        <FeedToolbar
          sort="newest"
          setSort={setSort}
          filter="all"
          setFilter={setFilter}
        />,
      );
      const [sortSelect, filterSelect] = screen.getAllByRole("combobox");
      await user.selectOptions(sortSelect!, "likes");
      await user.selectOptions(filterSelect!, "media");
      expect(setSort).toHaveBeenCalledWith("likes");
      expect(setFilter).toHaveBeenCalledWith("media");
    });
  });
});
