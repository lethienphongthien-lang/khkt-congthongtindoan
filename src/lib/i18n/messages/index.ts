import cms from "./cms";
import ui from "./ui";
import common from "./common";
import members from "./members";
import community from "./community";
import dash from "./dash";
import publicArea from "./public";
import app from "./app";
import misc from "./misc";
// Mỗi khu vực một file (home, news, ...): import rồi thêm vào mảng AREAS. Khóa phải có tiền tố duy nhất theo khu vực.
const AREAS = [community, common, app, publicArea, cms, ui, dash, members, misc];

type Union<T> = (T extends unknown ? (x: T) => void : never) extends (x: infer I) => void ? I : never;
type Dict = Union<(typeof AREAS)[number]["vi"]>;

export const vi = Object.assign({}, ...AREAS.map((a) => a.vi)) as Dict;
export const en = Object.assign({}, ...AREAS.map((a) => a.en)) as Record<keyof Dict, string>;
