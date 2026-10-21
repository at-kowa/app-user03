// 画面とデータアクセスで共通に使う型
export type Role = "general" | "staff" | "admin";
export type TicketType = "question" | "request" | "trouble";
export type Status = "received" | "progress" | "done";
export type CloseType = "answered" | "handled" | "declined" | "withdrawn";
export type Urgency = "stopped" | "workaround" | "low";

export type User = {
  id: string;
  empNo: string;
  name: string;
  dept: string;
  siteId: number;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
};

export type Site = { id: number; name: string; sort: number };
export type Location = { id: number; siteId: number; name: string };
export type Category = { id: number; name: string };
export type Masters = { sites: Site[]; locations: Location[]; categories: Category[] };
export type Settings = { autoLogoutMinutes: number; pollSeconds: number };

export type Image = { name: string; type: string; size: number; dataUrl: string };

export type Attachment = Image & {
  id: string;
  ticketId: string;
  commentId: string | null;
  uploaderId: string;
};

export type Ticket = {
  id: string;
  number: string;
  type: TicketType;
  categoryId: number;
  siteId: number;
  locationId: number | null;
  locationText: string;
  title: string;
  body: string;
  occurredAt: string | null;
  urgency: Urgency;
  allowPublish: boolean;
  posterId: string;
  assigneeId: string | null;
  status: Status;
  closeType: CloseType | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // 未読判定用：投稿者に知らせる更新／情シスに知らせる更新の日時
  posterActivityAt: string;
  staffActivityAt: string;
};

export type TicketView = Ticket & {
  posterName: string;
  assigneeName: string;
  categoryName: string;
  siteName: string;
  locationName: string;
  unread?: boolean;
};

export type Comment = {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  internal: boolean;
  createdAt: string;
};

export type Answer = { id: string; ticketId: string; authorId: string; body: string; createdAt: string };

export type Faq = {
  id: string;
  ticketId: string | null;
  title: string;
  question: string;
  answer: string;
  categoryId: number;
  type: TicketType;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type FaqView = Faq & { categoryName: string };

export type TicketDetail = TicketView & {
  comments: (Comment & { authorName: string; attachments: Attachment[] })[];
  answers: (Answer & { authorName: string })[];
  attachments: Attachment[];
  faq: Faq | null;
};

export type NewTicketInput = {
  type: TicketType;
  categoryId: number;
  siteId: number;
  locationId: number | null;
  locationText: string;
  title: string;
  body: string;
  occurredAt: string | null;
  urgency: Urgency;
  allowPublish: boolean;
  images: Image[];
};

export type FaqInput = {
  id: string | null;
  ticketId: string | null;
  title: string;
  question: string;
  answer: string;
  categoryId: number;
  type: TicketType;
  published: boolean;
};

export type Summary = { mine: number; unread: number; unassigned?: number; assignedToMe?: number };
