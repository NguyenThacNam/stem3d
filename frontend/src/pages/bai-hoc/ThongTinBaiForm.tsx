/**
 * Biểu mẫu thông tin bài (UC 20 bước 2): tên bài, môn, lớp, bộ sách, chương, số bài, loại bài.
 * Dùng chung cho hộp thoại "Tạo bài học" và thẻ "Thông tin bài" của màn soạn bài.
 */
import { useId } from "react";
import { LESSON_TYPE_LABEL, type LessonType, type Subject } from "@/api/editorLessons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export interface ThongTinBai {
  title: string;
  subject_id: number | "";
  grade: number | "";
  book_series: string;
  chapter: string;
  /** Chuỗi để ô nhập trống được. */
  lesson_no: string;
  lesson_type: LessonType;
}

export type LoiThongTin = Partial<Record<keyof ThongTinBai, string>>;

export const THONG_TIN_TRONG: ThongTinBai = {
  title: "",
  subject_id: "",
  grade: "",
  book_series: "KNTT",
  chapter: "",
  lesson_no: "",
  lesson_type: "STRUCTURE",
};

/** Các lớp có môn (theo khoảng lớp của môn; chưa chọn môn thì 1–12). */
export function lopCuaMon(mon: Subject | undefined): number[] {
  const tu = mon?.min_grade ?? 1;
  const den = mon?.max_grade ?? 12;
  return Array.from({ length: den - tu + 1 }, (_, i) => tu + i);
}

/** Kiểm tra trên máy trước khi gửi (máy chủ vẫn kiểm tra lại). */
export function kiemTraThongTin(v: ThongTinBai): LoiThongTin {
  const loi: LoiThongTin = {};
  if (!v.title.trim()) loi.title = "Hãy nhập tên bài";
  if (v.subject_id === "") loi.subject_id = "Hãy chọn môn";
  if (v.grade === "") loi.grade = "Hãy chọn lớp";
  if (!v.book_series.trim()) loi.book_series = "Hãy nhập bộ sách, ví dụ KNTT";
  if (v.lesson_no.trim() && !/^\d{1,5}$/.test(v.lesson_no.trim()))
    loi.lesson_no = "Số bài là số nguyên dương";
  else if (v.lesson_no.trim() && (Number(v.lesson_no) < 1 || Number(v.lesson_no) > 32767))
    loi.lesson_no = "Số bài từ 1 đến 32767";
  return loi;
}

function Loi({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-1.5 text-[14px] text-danger">
      {text}
    </p>
  );
}

export function ThongTinBaiForm({
  value,
  onChange,
  subjects,
  errors,
  disabled,
  className,
}: {
  value: ThongTinBai;
  onChange: (v: ThongTinBai) => void;
  subjects: Subject[];
  errors: LoiThongTin;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const mon = subjects.find((s) => s.id === value.subject_id);
  const lop = lopCuaMon(mon);
  const doi = <K extends keyof ThongTinBai>(k: K, v: ThongTinBai[K]) => onChange({ ...value, [k]: v });
  const nhan = "mb-1.5 block text-[14px] text-text-2";
  const mo = (k: keyof ThongTinBai) => (errors[k] ? `${id}-${k}-err` : undefined);

  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-4", className)}>
      <div className="col-span-2">
        <label htmlFor={`${id}-title`} className={nhan}>
          Tên bài
        </label>
        <Input
          id={`${id}-title`}
          value={value.title}
          maxLength={300}
          disabled={disabled}
          placeholder="Ví dụ: Cá chép – cấu tạo ngoài"
          invalid={!!errors.title}
          aria-describedby={mo("title")}
          onChange={(e) => doi("title", e.target.value)}
        />
        <Loi id={`${id}-title-err`} text={errors.title} />
      </div>

      <div>
        <label htmlFor={`${id}-subject`} className={nhan}>
          Môn
        </label>
        <NativeSelect
          id={`${id}-subject`}
          value={value.subject_id}
          disabled={disabled}
          invalid={!!errors.subject_id}
          aria-describedby={mo("subject_id")}
          onChange={(e) => {
            const moi = e.target.value === "" ? "" : Number(e.target.value);
            const monMoi = subjects.find((s) => s.id === moi);
            // Đổi môn: lớp đang chọn ngoài khoảng của môn mới thì bỏ chọn.
            const conHopLe = value.grade !== "" && lopCuaMon(monMoi).includes(value.grade);
            onChange({ ...value, subject_id: moi, grade: conHopLe ? value.grade : "" });
          }}
        >
          <option value="">Chọn môn</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <Loi id={`${id}-subject_id-err`} text={errors.subject_id} />
      </div>

      <div>
        <label htmlFor={`${id}-grade`} className={nhan}>
          Lớp
        </label>
        <NativeSelect
          id={`${id}-grade`}
          value={value.grade}
          disabled={disabled}
          invalid={!!errors.grade}
          aria-describedby={mo("grade")}
          onChange={(e) => doi("grade", e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Chọn lớp</option>
          {lop.map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
        </NativeSelect>
        <Loi id={`${id}-grade-err`} text={errors.grade} />
      </div>

      <div>
        <label htmlFor={`${id}-book`} className={nhan}>
          Bộ sách
        </label>
        <Input
          id={`${id}-book`}
          value={value.book_series}
          maxLength={30}
          disabled={disabled}
          invalid={!!errors.book_series}
          aria-describedby={mo("book_series")}
          onChange={(e) => doi("book_series", e.target.value)}
        />
        <Loi id={`${id}-book_series-err`} text={errors.book_series} />
      </div>

      <div>
        <label htmlFor={`${id}-no`} className={nhan}>
          Số bài <span className="text-text-2">(không bắt buộc)</span>
        </label>
        <Input
          id={`${id}-no`}
          value={value.lesson_no}
          inputMode="numeric"
          maxLength={5}
          disabled={disabled}
          placeholder="Ví dụ: 34"
          invalid={!!errors.lesson_no}
          aria-describedby={mo("lesson_no")}
          onChange={(e) => doi("lesson_no", e.target.value)}
        />
        <Loi id={`${id}-lesson_no-err`} text={errors.lesson_no} />
      </div>

      <div className="col-span-2">
        <label htmlFor={`${id}-chapter`} className={nhan}>
          Chương <span className="text-text-2">(không bắt buộc)</span>
        </label>
        <Input
          id={`${id}-chapter`}
          value={value.chapter}
          maxLength={300}
          disabled={disabled}
          placeholder="Ví dụ: Đa dạng thế giới sống"
          invalid={!!errors.chapter}
          onChange={(e) => doi("chapter", e.target.value)}
        />
        <Loi id={`${id}-chapter-err`} text={errors.chapter} />
      </div>

      <fieldset className="col-span-2" disabled={disabled}>
        <legend className={nhan}>Loại bài</legend>
        <div className="flex gap-2">
          {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
            <label
              key={t}
              className={cn(
                "flex h-9 cursor-pointer items-center rounded-ctl border px-3 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                value.lesson_type === t
                  ? "border-accent bg-accent-weak font-medium text-accent-ink"
                  : "border-line-2 bg-surface text-text hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name={`${id}-type`}
                value={t}
                checked={value.lesson_type === t}
                onChange={() => doi("lesson_type", t)}
                className="sr-only"
              />
              {t === "STRUCTURE" ? "Cấu tạo (xem, gắn nhãn bộ phận)" : "Thí nghiệm (có thông số, chấm điểm)"}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
