export type Action =
  | "info"
  | "project.create"
  | "node.list"
  | "node.create"
  | "node.delete"
  | "node.connect"
  | "node.disconnect"
  | "node.errors"
  | "param.get"
  | "param.set"
  | "exec";

export interface Request {
  id: string;
  action: Action;
  params: Record<string, unknown>;
}

export interface SuccessResponse {
  id: string;
  status: "ok";
  data: unknown;
}

export interface ErrorResponse {
  id: string;
  status: "error";
  error: string;
}

export type Response = SuccessResponse | ErrorResponse;
