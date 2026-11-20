/**
 * Thẻ "Câu hỏi" của màn soạn bài (Hình 3-11; UC 23; API 57–59). Mỗi câu lưu riêng bằng nút "Lưu câu hỏi" (API theo
 * từng câu), không đi chung nút Lưu nháp của bài. Chỉ bài nháp mới sửa được (bài đã xuất bản: chỉ xem).
 * Ba loại câu: trắc nghiệm (2–6 phương án, một đáp án đúng), chọn bộ phận (bộ phận đã gắn nhãn của bài), nhập số
 * (đáp án, đơn vị, sai số cho phép).
 */
import { ArrowDown, ArrowUp, CircleCheck, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/client";
import {
  createQuestion,
  deleteQuestion,
  QUESTION_TYPE_LABEL,
  updateQuestion,
  type LessonDetail,
  type LessonQuestion,
  type QuestionType,
} from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  cauMoi,
  chuyenCau,
  DON_VI_TOI_DA,
  doiLoai,
  khacDaLuu,
  kiemTraCau,
  loiCauTuMayChu,
  type LoiCau,
  NOI_DUNG_TOI_DA,
  PHUONG_AN_TOI_DA,
  SO_PHUONG_AN,
  thanhDauVaoCau,
  tomTat,
  tuCauHoi,
  type CauNhap,
} from "./cau-hoi";

const CHU_CAI = "ABCDEF";
const LOAI: QuestionType[] = ["CHOICE", "PICK_PART", "NUMERIC"];

function LoiO({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="text-[13px] text-danger">
      {text}
    </p>
  );
}

export function TheCauHoi({
  bai,
  boPhanChuaLuu,
  nhap,
  onNhap,
  onDoiCauHoi,
  onDenTheBoPhan,
}: {
  bai: LessonDetail;
  /** Thẻ Bộ phận còn thay đổi chưa lưu (câu chọn bộ phận chỉ chọn được bộ phận đã lưu). */
  boPhanChuaLuu: boolean;
  /** Câu đang soạn (giữ ở màn soạn để đổi thẻ không mất). null: chưa chọn câu nào. */
  nhap: CauNhap | null;
  onNhap: (c: CauNhap | null) => void;
  /** Danh sách câu hỏi trên máy chủ vừa đổi (thêm, sửa, xóa, đổi thứ tự). */
  onDoiCauHoi: (ds: LessonQuestion[]) => void;
  onDenTheBoPhan: () => void;
}) {
  const [loi, setLoi] = useState<LoiCau>({});
  const [thongBao, setThongBao] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xoa, setXoa] = useState<LessonQuestion | null>(null);

  const ds = bai.questions;
  const chiXem = bai.status === "PUBLISHED";
  const khoa = chiXem || dangLuu;
  const daLuu = nhap?.id != null ? (ds.find((q) => q.id === nhap.id) ?? null) : null;
  const doi = !!nhap && khacDaLuu(nhap, daLuu);

  function chon(c: CauNhap | null) {
    if (doi && !window.confirm("Câu hỏi đang sửa chưa lưu. Bỏ các thay đổi này?")) return;
    onNhap(c);
    setLoi({});
    setThongBao(null);
  }

  function sua(thay: Partial<CauNhap>) {
    if (nhap) onNhap({ ...nhap, ...thay });
  }

  function baoLoi(e: unknown, macDinh: string) {
    const lo = loiCauTuMayChu(e);
    if (lo) setLoi(lo);
    setThongBao({
      tone: "danger",
      text: lo
        ? "Câu hỏi chưa hợp lệ, hãy sửa các ô được đánh dấu"
        : e instanceof ApiError
          ? e.message
          : macDinh,
    });
  }

  async function luu() {
    if (!nhap) return;
    const l = kiemTraCau(nhap, bai.parts);
    setLoi(l);
    if (Object.keys(l).length) {
      setThongBao({ tone: "danger", text: "Câu hỏi chưa hợp lệ, hãy sửa các ô được đánh dấu" });
      return;
    }
    setDangLuu(true);
    setThongBao(null);
    try {
      const vao = thanhDauVaoCau(nhap);
      const q = nhap.id === null ? await createQuestion(bai.id, vao) : await updateQuestion(nhap.id, vao);
      onDoiCauHoi(nhap.id === null ? [...ds, q] : ds.map((x) => (x.id === q.id ? q : x)));
      onNhap(tuCauHoi(q));
      setThongBao({ tone: "success", text: nhap.id === null ? "Đã thêm câu hỏi" : "Đã lưu câu hỏi" });
    } catch (e) {
      baoLoi(e, "Không lưu được câu hỏi, hãy thử lại");
    } finally {
      setDangLuu(false);
    }
  }

  /** Đổi thứ tự: gửi lại câu đã lưu kèm vị trí mới (API 58). */
  async function chuyen(q: LessonQuestion, viTri: number) {
    setDangLuu(true);
    setThongBao(null);
    try {
      await updateQuestion(q.id, { ...thanhDauVaoCau(tuCauHoi(q)), sort_order: viTri });
      onDoiCauHoi(chuyenCau(ds, q.id, viTri));
    } catch (e) {
      baoLoi(e, "Không đổi được thứ tự, hãy thử lại");
    } finally {
      setDangLuu(false);
    }
  }

  async function xacNhanXoa() {
    if (!xoa) return;
    setDangLuu(true);
    try {
      await deleteQuestion(xoa.id);
      onDoiCauHoi(ds.filter((x) => x.id !== xoa.id).map((x, i) => ({ ...x, sort_order: i })));
      if (nhap?.id === xoa.id) onNhap(null);
      setLoi({});
      setThongBao({ tone: "success", text: "Đã xóa câu hỏi" });
    } catch (e) {
      baoLoi(e, "Không xóa được câu hỏi, hãy thử lại");
    } finally {
      setDangLuu(false);
      setXoa(null);
    }
  }

  const soThu = nhap ? (nhap.id === null ? ds.length + 1 : ds.findIndex((q) => q.id === nhap.id) + 1) : 0;

  return (
    <div className="flex flex-col gap-4">
      {chiXem && (
        <Alert tone="warn" className="items-center">
          <TriangleAlert strokeWidth={1.5} aria-hidden />
          <span>Bài đã xuất bản nên chỉ xem được câu hỏi. Hãy gỡ xuất bản nếu cần sửa.</span>
        </Alert>
      )}
      <div aria-live="polite" className="empty:hidden">
        {thongBao && (
          <Alert tone={thongBao.tone} className="items-center">
            {thongBao.tone === "success" ? (
              <CircleCheck strokeWidth={1.5} aria-hidden />
            ) : (
              <TriangleAlert strokeWidth={1.5} aria-hidden />
            )}
            <span>{thongBao.text}</span>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-6">
        {/* Danh sách câu */}
        <section className="self-start rounded-card border border-line bg-surface">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <h2 className="font-medium">Câu hỏi</h2>
            <span className="text-[13px] text-text-2">{ds.length} câu</span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              disabled={khoa}
              onClick={() => chon(cauMoi())}
            >
              <Plus strokeWidth={1.5} aria-hidden />
              Thêm câu hỏi
            </Button>
          </div>
          {ds.length === 0 && nhap?.id !== null ? (
            <p className="px-4 pb-6 text-[14px] text-text-2">
              Chưa có câu hỏi nào. Bài kiểm tra nhanh nên có 3–5 câu.
            </p>
          ) : (
            <ol aria-label="Danh sách câu hỏi" className="px-2 pb-2">
              {ds.map((q, i) => (
                <li key={q.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => chon(tuCauHoi(q))}
                    aria-current={nhap?.id === q.id || undefined}
                    className={cn(
                      "flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-ctl px-2 py-1.5 text-left hover:bg-surface-2",
                      nhap?.id === q.id && "bg-accent-weak hover:bg-accent-weak",
                    )}
                  >
                    <span className="text-[13px] text-text-2">
                      Câu {i + 1} · {QUESTION_TYPE_LABEL[q.question_type]}
                    </span>
                    <span className="truncate text-[15px]">{tomTat(q.content)}</span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Chuyển câu ${i + 1} lên`}
                    disabled={khoa || i === 0}
                    onClick={() => void chuyen(q, i - 1)}
                  >
                    <ArrowUp strokeWidth={1.5} aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Chuyển câu ${i + 1} xuống`}
                    disabled={khoa || i === ds.length - 1}
                    onClick={() => void chuyen(q, i + 1)}
                  >
                    <ArrowDown strokeWidth={1.5} aria-hidden />
                  </Button>
                </li>
              ))}
              {nhap?.id === null && (
                <li className="rounded-ctl bg-accent-weak px-2 py-1.5">
                  <span className="block text-[13px] text-text-2">
                    Câu {ds.length + 1} · {QUESTION_TYPE_LABEL[nhap.question_type]}
                  </span>
                  <span className="block truncate text-[15px] text-text-2">
                    {tomTat(nhap.content) || "Câu mới, chưa lưu"}
                  </span>
                </li>
              )}
            </ol>
          )}
        </section>

        {/* Ô soạn câu đang chọn */}
        <section className="rounded-card border border-line bg-surface p-5">
          {!nhap ? (
            <p className="py-10 text-center text-[14px] text-text-2">
              Chọn một câu trong danh sách hoặc bấm "Thêm câu hỏi".
            </p>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void luu();
              }}
            >
              <h2 className="font-medium">{nhap.id === null ? `Câu mới (câu ${soThu})` : `Câu ${soThu}`}</h2>

              <fieldset className="flex flex-col gap-1.5" disabled={khoa}>
                <legend className="mb-1.5 text-[14px] text-text-2">Loại câu</legend>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {LOAI.map((t) => (
                    <label
                      key={t}
                      className={cn(
                        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-accent/25",
                        nhap.question_type === t
                          ? "border-accent bg-accent-weak text-accent-ink"
                          : "border-line-2 hover:bg-surface-2",
                      )}
                    >
                      <input
                        type="radio"
                        name="loai-cau"
                        className="sr-only"
                        checked={nhap.question_type === t}
                        onChange={() => {
                          onNhap(doiLoai(nhap, t));
                          setLoi({});
                        }}
                      />
                      {QUESTION_TYPE_LABEL[t]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="noi-dung-cau" className="text-[14px] text-text-2">
                  Nội dung câu hỏi
                </label>
                <textarea
                  id="noi-dung-cau"
                  rows={3}
                  value={nhap.content}
                  maxLength={NOI_DUNG_TOI_DA}
                  disabled={khoa}
                  aria-invalid={!!loi.content || undefined}
                  aria-describedby={loi.content ? "loi-noi-dung" : undefined}
                  placeholder={
                    nhap.question_type === "PICK_PART" ? "Ví dụ: Bấm vào vây giúp cá giữ thăng bằng" : ""
                  }
                  onChange={(e) => sua({ content: e.target.value })}
                  className={cn(
                    "resize-none rounded-ctl border border-line-2 bg-surface px-3 py-2 text-[15px] text-text placeholder:text-text-2 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25 disabled:opacity-60",
                    loi.content && "border-danger",
                  )}
                />
                <LoiO id="loi-noi-dung" text={loi.content} />
              </div>

              {nhap.question_type === "CHOICE" && (
                <fieldset className="flex flex-col gap-2" disabled={khoa}>
                  <legend className="mb-1.5 text-[14px] text-text-2">
                    Phương án – chọn ô tròn ở phương án đúng
                  </legend>
                  {nhap.options.map((x, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="dap-an-dung"
                          aria-label={`Phương án ${CHU_CAI[i]} là đáp án đúng`}
                          checked={nhap.dapAn === i}
                          onChange={() => sua({ dapAn: i })}
                          className="size-4 accent-accent"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-ctl text-[14px] font-medium",
                            nhap.dapAn === i ? "bg-accent text-white" : "bg-surface-2 text-text-2",
                          )}
                        >
                          {CHU_CAI[i]}
                        </span>
                        <Input
                          className="flex-1"
                          aria-label={`Phương án ${CHU_CAI[i]}`}
                          value={x}
                          maxLength={PHUONG_AN_TOI_DA}
                          invalid={!!loi[`options.${i}`]}
                          onChange={(e) =>
                            sua({ options: nhap.options.map((y, j) => (j === i ? e.target.value : y)) })
                          }
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Bỏ phương án ${CHU_CAI[i]}`}
                          disabled={nhap.options.length <= SO_PHUONG_AN.it}
                          onClick={() =>
                            sua({
                              options: nhap.options.filter((_, j) => j !== i),
                              dapAn:
                                nhap.dapAn === null || nhap.dapAn === i
                                  ? null
                                  : nhap.dapAn > i
                                    ? nhap.dapAn - 1
                                    : nhap.dapAn,
                            })
                          }
                        >
                          <X strokeWidth={1.5} aria-hidden />
                        </Button>
                      </div>
                      <LoiO id={`loi-pa-${i}`} text={loi[`options.${i}`]} />
                    </div>
                  ))}
                  {nhap.options.length < SO_PHUONG_AN.nhieu && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="self-start"
                      onClick={() => sua({ options: [...nhap.options, ""] })}
                    >
                      <Plus strokeWidth={1.5} aria-hidden />
                      Thêm phương án
                    </Button>
                  )}
                  <LoiO id="loi-phuong-an" text={loi.options} />
                  <LoiO id="loi-dap-an" text={loi.answer} />
                </fieldset>
              )}

              {nhap.question_type === "PICK_PART" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bo-phan-dung" className="text-[14px] text-text-2">
                    Bộ phận đúng – học sinh bấm vào bộ phận này trên mô hình
                  </label>
                  {bai.parts.length === 0 ? (
                    <p className="text-[14px] text-text-2">
                      Bài chưa gắn nhãn bộ phận nào.{" "}
                      <button type="button" className="text-accent underline" onClick={onDenTheBoPhan}>
                        Gắn nhãn ở thẻ Bộ phận
                      </button>{" "}
                      rồi lưu bài trước.
                    </p>
                  ) : (
                    <NativeSelect
                      id="bo-phan-dung"
                      value={nhap.partId ?? ""}
                      disabled={khoa}
                      invalid={!!loi.answer}
                      aria-describedby={loi.answer ? "loi-bo-phan" : undefined}
                      onChange={(e) => sua({ partId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">Chọn bộ phận…</option>
                      {bai.parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                  {boPhanChuaLuu && (
                    <p className="text-[13px] text-text-2">
                      Thẻ Bộ phận còn thay đổi chưa lưu: chỉ chọn được bộ phận đã lưu.
                    </p>
                  )}
                  <LoiO id="loi-bo-phan" text={loi.answer} />
                </div>
              )}

              {nhap.question_type === "NUMERIC" && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="dap-an-so" className="text-[14px] text-text-2">
                        Đáp án
                      </label>
                      <Input
                        id="dap-an-so"
                        inputMode="decimal"
                        placeholder="Ví dụ: 12,5"
                        value={nhap.giaTri}
                        disabled={khoa}
                        invalid={!!loi.answer}
                        aria-describedby={loi.answer ? "loi-dap-an-so" : undefined}
                        onChange={(e) => sua({ giaTri: e.target.value })}
                      />
                      <LoiO id="loi-dap-an-so" text={loi.answer} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="don-vi" className="text-[14px] text-text-2">
                        Đơn vị (nếu có)
                      </label>
                      <Input
                        id="don-vi"
                        placeholder="Ví dụ: mL"
                        value={nhap.donVi}
                        maxLength={DON_VI_TOI_DA}
                        disabled={khoa}
                        invalid={!!loi.options}
                        onChange={(e) => sua({ donVi: e.target.value })}
                      />
                      <LoiO id="loi-don-vi" text={loi.options} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="sai-so" className="text-[14px] text-text-2">
                        Sai số cho phép (±)
                      </label>
                      <Input
                        id="sai-so"
                        inputMode="decimal"
                        placeholder="Ví dụ: 0,1"
                        value={nhap.saiSo}
                        disabled={khoa}
                        invalid={!!loi.tolerance}
                        aria-describedby={loi.tolerance ? "loi-sai-so" : undefined}
                        onChange={(e) => sua({ saiSo: e.target.value })}
                      />
                      <LoiO id="loi-sai-so" text={loi.tolerance} />
                    </div>
                  </div>
                  <p className="text-[13px] text-text-2">
                    Học sinh trả lời trong khoảng đáp án ± sai số thì được tính đúng. Nhập 0 nếu phải đúng
                    tuyệt đối.
                  </p>
                </div>
              )}

              {!chiXem && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <Button type="submit" variant="primary" disabled={dangLuu || (!doi && nhap.id !== null)}>
                    {dangLuu ? "Đang lưu" : nhap.id === null ? "Thêm câu hỏi" : "Lưu câu hỏi"}
                  </Button>
                  <Button
                    type="button"
                    disabled={dangLuu || !doi}
                    onClick={() => {
                      onNhap(daLuu ? tuCauHoi(daLuu) : null);
                      setLoi({});
                    }}
                  >
                    {nhap.id === null ? "Bỏ câu này" : "Hủy thay đổi"}
                  </Button>
                  {daLuu && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-auto text-danger hover:text-danger"
                      disabled={dangLuu}
                      onClick={() => setXoa(daLuu)}
                    >
                      <Trash2 strokeWidth={1.5} aria-hidden />
                      Xóa câu hỏi
                    </Button>
                  )}
                </div>
              )}
            </form>
          )}
        </section>
      </div>

      <Dialog open={xoa !== null} onOpenChange={(mo) => !mo && !dangLuu && setXoa(null)}>
        <DialogContent>
          <DialogTitle>Xóa câu hỏi?</DialogTitle>
          <DialogDescription>{xoa ? tomTat(xoa.content) : ""}</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setXoa(null)} disabled={dangLuu}>
              Không xóa
            </Button>
            <Button
              className="border-danger bg-danger text-white hover:border-danger-ink hover:bg-danger-ink"
              onClick={() => void xacNhanXoa()}
              disabled={dangLuu}
            >
              {dangLuu ? "Đang xóa" : "Xóa câu hỏi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
