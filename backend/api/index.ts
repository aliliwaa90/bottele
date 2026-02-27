import { app } from "../src/app.js";

export default function vercelHandler(req: any, res: any) {
  return app(req, res);
}
