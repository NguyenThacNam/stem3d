/** Logo: ô vuông màu nhấn có lưới ô li trắng mờ + tên hệ thống (theo .brand/.mark trong mẫu). */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden
        className="size-7 shrink-0 rounded-[7px] bg-accent"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.28) 1px,transparent 1px)",
          backgroundSize: "7px 7px",
          backgroundPosition: "3px 3px",
        }}
      />
      <div className="leading-tight">
        <div className="text-[15px] font-medium">Phòng thí nghiệm ảo</div>
        <div className="text-[13px] text-text-2">Lý · Hóa · Sinh 3D</div>
      </div>
    </div>
  );
}
