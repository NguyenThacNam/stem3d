from app.core.security import hash_password, verify_password


def test_bam_va_kiem_tra_mat_khau() -> None:
    ban_bam = hash_password("Mật-khẩu-đúng-1")

    assert ban_bam != "Mật-khẩu-đúng-1"
    assert verify_password("Mật-khẩu-đúng-1", ban_bam)
    assert not verify_password("mat-khau-sai", ban_bam)


def test_mat_khau_qua_72_byte_luon_sai() -> None:
    mat_khau = "a" * 72
    ban_bam = hash_password(mat_khau)

    assert verify_password(mat_khau, ban_bam)
    # bcrypt tự nó sẽ bỏ qua phần sau byte 72; verify_password phải từ chối.
    assert not verify_password(mat_khau + "bat-ky", ban_bam)


def test_ban_bam_hong_tra_false() -> None:
    assert verify_password("bat-ky", "x") is False
    assert verify_password("bat-ky", "") is False
