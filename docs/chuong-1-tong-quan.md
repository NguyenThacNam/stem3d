# CHƯƠNG 1. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT VỀ PHÒNG THÍ NGHIỆM ẢO 3D TRONG DẠY HỌC STEM

## 1.1. Giới thiệu

Trong bối cảnh chuyển đổi số giáo dục, các nhà trường phổ thông đang từng bước xây dựng không gian giáo dục STEM gồm bốn nhóm phần mềm: mô phỏng (phòng thí nghiệm ảo), điều khiển (lập trình và trí tuệ nhân tạo), đo lường (phân tích dữ liệu cảm biến) và kiến tạo (thiết kế, chế tạo). Trong đó, phòng thí nghiệm ảo giữ vai trò nền tảng: cho phép học sinh quan sát cấu tạo, tiến hành thí nghiệm và kiểm chứng lý thuyết khoa học một cách an toàn, trực quan, kể cả với những hiện tượng khó quan sát hoặc nguy hiểm trong phòng thí nghiệm thật.

Tuy nhiên, thực tế triển khai còn nhiều hạn chế. Phần lớn phần mềm mô phỏng hiện có là sản phẩm nước ngoài, giao diện và thuật ngữ chưa Việt hóa đầy đủ, nội dung không bám theo sách giáo khoa Việt Nam. Mỗi phần mềm thường chỉ phục vụ một môn hoặc một cấp học, trong khi tiêu chí Trường học số của Hà Nội giới hạn **mỗi trường tối đa 03 phần mềm thí nghiệm ảo** và yêu cầu phần mềm phục vụ trực tiếp chương trình cốt lõi (Hóa học, Vật lí, Sinh học). Điều này buộc nhà trường phải lựa chọn giữa việc dàn trải nhiều phần mềm hoặc chấp nhận bỏ trống một số môn, cấp học.

Xuất phát từ thực tế đó, công ty xây dựng hệ thống **Phòng thí nghiệm ảo 3D STEM** – một nền tảng duy nhất bao phủ ba môn Vật lí, Hóa học, Sinh học (và môn Khoa học ở Tiểu học, Khoa học tự nhiên ở THCS) cho cả ba cấp học. Mỗi bài học là một mô hình 3D có thể xoay, phóng to, tháo rời từng bộ phận, kèm chú thích theo sách giáo khoa; các bài thí nghiệm cho phép học sinh thay đổi thông số và quan sát số liệu, đồ thị bằng tiếng Việt. Giáo viên có thể chiếu phim mở đầu, giao bài và theo dõi kết quả của học sinh.

Bài học mẫu đầu tiên của hệ thống – **mô hình cá chép robot** với chế độ phim tháo rời và chế độ "Tự khám phá" – đã được xây dựng và chạy thử, cho thấy cách làm mô hình, phim tháo rời và chế độ tự khám phá dùng được trong thực tế.

*Hình 1-1. Bài học mẫu cá chép ở chế độ Tự khám phá*

![Hình 1-1](../ca-chep/review/interactive_sheet.png)

Trong phạm vi tài liệu này, hệ thống tập trung vào: kiến trúc nền tảng chung (khung bài học, tài khoản, lớp học, giao bài, lưu kết quả), quy trình đưa một mô hình 3D vào hệ thống, và ba bài học thử nghiệm đại diện cho ba kiểu bài: **Cá chép** (KHTN 6) – bài cấu tạo dùng mô hình tự dựng; **Chuẩn độ axit – bazơ** (Hóa học 11) – bài thí nghiệm có công thức tính toán; **Cấu tạo tim người** (KHTN 8) – bài cấu tạo dùng mô hình miễn phí có giấy phép (vì dựng tim bằng code không đạt yêu cầu, xem mục 1.4). Ba bài này chưa bao gồm bài cấp Tiểu học, bài môn Vật lí và mô hình thuê thiết kế; đây là giới hạn của giai đoạn thử nghiệm, các loại bài còn lại được bổ sung khi mở rộng nội dung.

## 1.2. Phòng thí nghiệm ảo và mô phỏng 3D trong dạy học

### 1.2.1. Khái niệm và thành phần của phòng thí nghiệm ảo

Phòng thí nghiệm ảo không đơn thuần là một trang web có hình 3D, mà là một hệ thống gồm nhiều thành phần phối hợp:

- **Mô hình 3D (Asset):** hình khối ba chiều của đối tượng cần học (con cá, động cơ, tế bào, bộ dụng cụ chuẩn độ). Mỗi bộ phận là một phần riêng biệt, có tên, để có thể chọn, làm nổi bật hoặc tháo rời.
- **Kịch bản tương tác:** quy định mô hình phản ứng thế nào với thao tác của học sinh – bấm vào bộ phận nào thì camera bay tới đâu, bộ phận nào tách ra, hoạt cảnh nào chạy.
- **Nội dung kiến thức:** nhãn và chú thích của từng bộ phận, câu hỏi kiểm tra, công thức của thí nghiệm. Nội dung này lấy theo sách giáo khoa, tách riêng khỏi mô hình để có thể sửa mà không phải dựng lại mô hình.
- **Dữ liệu học tập:** thông số học sinh đã chọn khi làm thí nghiệm, kết quả đo, điểm bài kiểm tra – phục vụ giáo viên đánh giá.

### 1.2.2. Căn cứ chương trình và tiêu chuẩn

Hệ thống được xây dựng dựa trên hai căn cứ:

**Chương trình giáo dục phổ thông 2018.** Nội dung khoa học tự nhiên được tổ chức theo cấp học:

| Cấp học | Môn học | Đặc điểm nội dung |
|---|---|---|
| Tiểu học (lớp 4–5) | Khoa học | Quan sát sự vật, hiện tượng gần gũi; chưa yêu cầu định lượng |
| THCS (lớp 6–9) | Khoa học tự nhiên | Tích hợp Vật lí – Hóa học – Sinh học; bắt đầu đo đạc, tính toán đơn giản |
| THPT (lớp 10–12) | Vật lí, Hóa học, Sinh học | Phân môn riêng; thí nghiệm định lượng, xử lý số liệu, đồ thị |

Hệ thống chọn bộ sách **Kết nối tri thức với cuộc sống** làm căn cứ cho tên bài và lời chú thích ở giai đoạn đầu.

**Tiêu chuẩn phần mềm giáo dục STEM (tiêu chí Trường học số Hà Nội).** Các yêu cầu có ảnh hưởng trực tiếp tới thiết kế hệ thống:

- Mỗi trường tối đa 03 phần mềm thí nghiệm ảo → hệ thống gộp ba môn, ba cấp vào **một** nền tảng.
- Phần mềm phải phục vụ trực tiếp chương trình cốt lõi Hóa – Lý – Sinh → nội dung bám sách giáo khoa.
- Phần mềm thu nhận, hiển thị, xử lý số liệu phải hỗ trợ **tiếng Việt** → giao diện, đơn vị, đồ thị Việt hóa hoàn toàn.
- Tiểu học: mô phỏng trực quan, an toàn, phù hợp lứa tuổi. Trung học: nghiên cứu chuyên sâu (Hóa học: thực hiện phản ứng, xác định chất, đo lường; Vật lí: chuyển động, lực, điện, từ; Sinh học: tế bào, mô, cơ quan, di truyền).

### 1.2.3. Đặc thù theo cấp học

Cùng một nền tảng nhưng mỗi cấp học cần cách trình bày khác nhau:

| Tiêu chí | Tiểu học | THCS | THPT |
|---|---|---|---|
| Giao diện | Nút lớn, ít chữ, nhiều hình | Cân bằng hình và chữ | Đầy đủ bảng số liệu, đồ thị |
| Thao tác | Bấm để xem, xoay mô hình | Bấm, tháo rời, chỉnh thông số đơn giản | Chỉnh nhiều thông số, ghi và phân tích số liệu |
| Số liệu | Không hiển thị số | Số liệu đơn giản | Đồ thị, giá trị trung bình, lớn nhất, nhỏ nhất |
| Kiểm tra | Bấm chọn bộ phận đúng | Trắc nghiệm, gắn nhãn | Trắc nghiệm, bài tập tính toán từ số liệu thí nghiệm |

### 1.2.4. Quy trình học tập trên hệ thống

Hệ thống được thiết kế theo quy trình một tiết học có sử dụng phòng thí nghiệm ảo:

- **Bước 1 – Chọn bài:** học sinh (hoặc giáo viên) chọn cấp học → môn → bài theo đúng mục lục sách giáo khoa.
- **Bước 2 – Phim mở đầu:** mô hình tự chạy hoạt cảnh tổng quan và tháo rời từng bộ phận, dùng để giáo viên chiếu đầu giờ.
- **Bước 3 – Tự khám phá:** học sinh tự xoay, phóng to, bấm vào từng bộ phận để xem bộ phận tách ra và đọc chú thích theo sách.
- **Bước 4 – Thí nghiệm:** với bài có thí nghiệm, học sinh thay đổi thông số (ví dụ thể tích dung dịch nhỏ vào, cường độ dòng điện), quan sát hiện tượng và số liệu, đồ thị thay đổi theo.
- **Bước 5 – Kiểm tra nhanh:** 3–5 câu hỏi trả lời trực tiếp trên mô hình; kết quả được lưu để giáo viên xem.

## 1.3. Lý thuyết nền tảng phát triển hệ thống

Hệ thống được phát triển theo mô hình **Client – Server**, phía máy chủ xây dựng bằng **FastAPI** và tổ chức theo kiến trúc đa tầng, kết hợp phong cách thiết kế RESTful API và kênh WebSocket cho các tính năng thời gian thực.

Điểm khác biệt quan trọng so với một ứng dụng web thông thường là **phần tính toán nặng nhất – dựng hình 3D và mô phỏng thí nghiệm – chạy hoàn toàn trên máy học sinh**:

- **Client (trình duyệt của học sinh, giáo viên):** tải mô hình 3D, dựng hình, xử lý thao tác xoay, bấm, tháo rời; tính toán kết quả thí nghiệm theo công thức; hiển thị đồ thị. Nhờ vậy mô hình phản hồi tức thì, không phụ thuộc tốc độ mạng.
- **Server:** cung cấp danh mục bài học và file mô hình, quản lý tài khoản, lớp học, giao bài; lưu và chấm kết quả; điều phối chế độ giáo viên điều khiển cả lớp.

Cách phân chia này giúp một máy chủ trung tâm phục vụ được nhiều trường cùng lúc, vì phần tính toán nặng nhất nằm ở máy học sinh. Máy chủ chỉ tính lại những công thức ngắn khi chấm bài, không chạy lại mô phỏng.

### 1.3.1. Kiến trúc đa tầng trong FastAPI

Mã nguồn phía máy chủ được tổ chức thành các tầng:

- **Router:** tiếp nhận request HTTP/WebSocket, kiểm tra quyền, gọi tầng Service.
- **Service:** xử lý nghiệp vụ (giao bài, chấm điểm, kiểm tra mô hình khi nạp).
- **Repository:** truy cập cơ sở dữ liệu thông qua SQLAlchemy.
- **Model:** ánh xạ các bảng trong PostgreSQL.
- **Schema (Pydantic):** định nghĩa và kiểm tra dữ liệu vào/ra của API.

Cách tổ chức này tương đương mô hình Controller – Service – Repository – Entity – DTO quen thuộc trong Spring Boot, giúp tách biệt tầng tiếp nhận request, tầng nghiệp vụ và tầng dữ liệu, thuận lợi cho bảo trì, kiểm thử và mở rộng.

### 1.3.2. RESTful API và WebSocket

Các API được thiết kế theo tài nguyên (resource-based), dữ liệu trao đổi dạng JSON, sử dụng các phương thức HTTP tiêu chuẩn:

- **GET:** lấy danh mục cấp học, môn, bài học; thông tin mô hình và chú thích bộ phận; kết quả của học sinh.
- **POST:** tạo bài học, nạp mô hình, giao bài cho lớp, nộp kết quả thí nghiệm và bài kiểm tra.
- **PUT:** cập nhật chú thích, thông tin bài học, thông tin lớp.
- **DELETE:** xóa bài học, mô hình hoặc bài giao không còn sử dụng.

Bên cạnh REST, hệ thống dùng **WebSocket** cho chế độ **giáo viên điều khiển**: khi giáo viên xoay mô hình hoặc mở một bộ phận, lệnh được phát tới màn hình của cả lớp để mọi học sinh cùng nhìn một góc. REST không phù hợp cho tình huống này vì yêu cầu máy chủ chủ động đẩy dữ liệu xuống nhiều máy cùng lúc với độ trễ thấp.

### 1.3.3. Đồ họa 3D trên nền web

- **WebGL:** chuẩn đồ họa 3D tích hợp sẵn trong các trình duyệt hiện đại (Chrome, Cốc Cốc, Edge, Safari), cho phép dùng card đồ họa của máy mà không cần cài thêm phần mềm.
- **Three.js:** thư viện JavaScript phổ biến nhất xây dựng trên WebGL, cung cấp sẵn camera, ánh sáng, vật liệu, nạp mô hình và xử lý chọn đối tượng bằng chuột/cảm ứng.
- **glTF / GLB:** định dạng mô hình 3D chuẩn mở (do Khronos Group phát triển), được gọi là "JPEG của 3D". GLB là dạng đóng gói một file, chứa hình khối, vật liệu, texture và hoạt cảnh. Hầu hết phần mềm thiết kế (Blender, 3ds Max, Maya) và kho mô hình đều xuất được định dạng này, nên hệ thống chọn **GLB làm chuẩn duy nhất** cho mọi mô hình nạp vào.
- **Nén Draco:** kỹ thuật nén hình khối 3D, giảm dung lượng file mô hình nhiều lần, giúp tải nhanh trên mạng trường học.

## 1.4. Nguồn mô hình 3D và quy định chọn mô hình

Chất lượng mô hình 3D quyết định chất lượng bài học. Qua quá trình làm thử các bài mẫu, đội phát triển rút ra nhận xét: **mỗi loại đối tượng cần một cách làm mô hình khác nhau**. Dựng mô hình bằng code cho kết quả rất tốt với vật thể cứng ghép từ khối (máy móc, robot), nhưng kém với mô sống mềm (tim, phổi, tế bào). Bài thử nghiệm mô hình quả tim dựng bằng code sau khoảng 10 vòng chỉnh sửa vẫn chưa đạt yêu cầu thẩm mỹ, trong khi mô hình cá chép robot đạt yêu cầu sau 7 vòng. Vì vậy hệ thống được thiết kế **không phụ thuộc cách làm mô hình**: mô hình từ nguồn nào cũng được nạp theo cùng một chuẩn.

### 1.4.1. Dựng bằng code (bộ công cụ cutaway)

- **Phù hợp với:** máy móc, robot, động cơ, dụng cụ thí nghiệm (ống nghiệm, buret, mạch điện), phân tử và mạng tinh thể (dựng tự động từ tọa độ nguyên tử nên chính xác tuyệt đối).
- **Ưu điểm:** chủ động hoàn toàn, sửa nhanh, tự động sinh phim tháo rời; bản quyền thuộc về đơn vị phát triển.
- **Hạn chế:** không phù hợp với mô sống. Con vật dựng theo kiểu robot chỉ dùng để dạy **cấu tạo ngoài**, không dùng để dạy cấu tạo trong (vì bên trong là máy móc, dễ gây hiểu nhầm cho học sinh).

*Hình 1-2. Phim tháo rời mô hình cá chép dựng bằng cutaway*

![Hình 1-2](../ca-chep/review/film_beats.png)

### 1.4.2. Mô hình miễn phí có giấy phép mở

- **Phù hợp với:** giải phẫu, cơ quan, tế bào – những đối tượng khó dựng bằng code.
- **Nguồn tham khảo:** Z-Anatomy, BodyParts3D, NIH 3D, Smithsonian 3D, Sketchfab (lọc theo giấy phép).
- **Lưu ý:** "miễn phí" không có nghĩa là dùng không điều kiện. Phần lớn mô hình miễn phí yêu cầu ghi tên tác giả; một số cấm dùng vào mục đích thương mại.

### 1.4.3. Thuê thiết kế

- **Phù hợp với:** đối tượng không tìm được mẫu phù hợp, hoặc cần đúng hình như trong sách giáo khoa (tế bào thực vật, cấu tạo hoa, các kì nguyên phân).
- **Yêu cầu:** người thiết kế giao file GLB theo chuẩn của hệ thống (mỗi bộ phận một phần riêng, đặt tên theo quy ước, giới hạn dung lượng); hợp đồng có điều khoản chuyển giao bản quyền.

### 1.4.4. Quy định chọn mô hình

Để tránh rủi ro bản quyền mà không phải xây dựng chức năng quản lý bản quyền phức tạp, hệ thống áp dụng quy định đơn giản:

| Loại nguồn | Được dùng | Nghĩa vụ |
|---|---|---|
| Tự dựng (cutaway) | Có | Không |
| Thuê thiết kế (có chuyển giao bản quyền) | Có | Không |
| Miễn phí CC0 | Có | Không |
| Miễn phí CC BY, CC BY-SA | Có | Ghi tên tác giả trong bài học |
| Miễn phí CC BY-NC (cấm thương mại), CC BY-ND (cấm chỉnh sửa) | **Không** | — |

Mỗi mô hình chỉ cần lưu thêm hai thông tin: **loại nguồn** và **dòng ghi công**. Dòng ghi công được tự động hiển thị ở cuối bài học.

## 1.5. Công nghệ và ngôn ngữ lập trình sử dụng

### 1.5.1. Frontend: React và Three.js

- **Mục đích sử dụng:** xây dựng giao diện người dùng (danh mục bài, trang lớp học, trang quản trị) và khung hiển thị 3D của bài học.
- **Vì sao chọn:** React phổ biến, chia giao diện thành các thành phần dùng lại được. Three.js là thư viện 3D trên web trưởng thành nhất, có sẵn bộ nạp GLB, nén Draco và xử lý chọn đối tượng. Bài mẫu cá chép đã được xây dựng trên Three.js nên tái sử dụng được trực tiếp.
- **Triển khai thực tế:** khung bài học là một thành phần React dùng chung cho mọi bài; mỗi bài chỉ khác nhau ở file mô hình GLB và file cấu hình (danh sách bộ phận, chú thích, góc camera, thông số thí nghiệm).


### 1.5.2. Backend: Python và FastAPI

- **Mục đích sử dụng:** xây dựng máy chủ, cung cấp RESTful API và kênh WebSocket cho toàn hệ thống.
- **Vì sao chọn:**
  - Đơn vị phát triển đã vận hành hệ thống chatbot hỗ trợ giáo viên và học sinh bằng Python (FastAPI, SQLAlchemy, Alembic). Dùng chung công nghệ giúp tái sử dụng mã nguồn, dùng chung tài khoản và thuận lợi tích hợp trợ lý AI vào bài học sau này.
  - Python mạnh về xử lý số liệu (pandas, NumPy), phù hợp với chức năng phân tích số liệu thí nghiệm và cảm biến; đồng thời là ngôn ngữ chủ đạo của trí tuệ nhân tạo – hướng mở rộng cho cấp THPT chuyên.
  - Python là ngôn ngữ lập trình trong chương trình Tin học THPT 2018, thuận lợi khi mở rộng sang bài học lập trình kết hợp mô phỏng.
  - FastAPI hỗ trợ bất đồng bộ (async), WebSocket, tự sinh tài liệu API (Swagger UI) và kiểm tra dữ liệu tự động qua Pydantic.
- **Triển khai thực tế:** FastAPI tiếp nhận request từ giao diện, xử lý nghiệp vụ (giao bài, chấm kết quả, kiểm tra mô hình khi nạp), truy vấn cơ sở dữ liệu và phát lệnh điều khiển lớp học qua WebSocket.


### 1.5.3. Cơ sở dữ liệu: PostgreSQL

- **Mục đích sử dụng:** lưu trữ người dùng, trường, lớp; danh mục bài học, mô hình, bộ phận, chú thích; bài giao, kết quả thí nghiệm và bài kiểm tra.
- **Vì sao chọn:** hệ quản trị CSDL quan hệ mã nguồn mở, ổn định; hỗ trợ kiểu JSONB để lưu cấu hình bài học và số liệu thí nghiệm có cấu trúc linh hoạt; đã được dùng trong hệ thống chatbot.
- **Triển khai thực tế:** dữ liệu cố định (tài khoản, lớp, bài học) lưu thành các bảng quan hệ; thông số và số liệu của từng lần làm thí nghiệm lưu dạng JSONB vì mỗi bài có bộ thông số khác nhau. Lược đồ CSDL được quản lý phiên bản bằng Alembic.


### 1.5.4. Nginx

- **Mục đích sử dụng:** máy chủ web phục vụ giao diện và các file mô hình 3D; chuyển tiếp request API tới FastAPI.
- **Vì sao chọn:** phục vụ file tĩnh rất nhanh, hỗ trợ nén và bộ nhớ đệm – quan trọng vì file mô hình 3D có dung lượng lớn và được nhiều học sinh tải cùng lúc.

### 1.5.5. Docker và Docker Compose

- **Mục đích sử dụng:** đóng gói và triển khai toàn bộ hệ thống.
- **Vì sao chọn:** triển khai máy chủ trung tâm chỉ bằng một lệnh, không phải cài tay từng thành phần; môi trường phát triển, thử nghiệm và vận hành giống hệt nhau; cập nhật hoặc quay lại phiên bản cũ dễ dàng; giai đoạn thử nghiệm chạy một bản container xử lý (api), khi cần chạy nhiều bản thì các phòng lớp học dùng Redis để chuyển sự kiện giữa các bản; thống nhất với cách triển khai của hệ thống chatbot.
- **Triển khai thực tế:** máy chủ trung tâm chạy ba container:

| Container | Thành phần | Vai trò |
|---|---|---|
| `web` | Nginx | Phục vụ giao diện React và file mô hình GLB; chuyển tiếp API |
| `api` | FastAPI | Xử lý nghiệp vụ, REST API, WebSocket |
| `db` | PostgreSQL | Lưu trữ dữ liệu, volume riêng để sao lưu |

Nhà trường không phải cài đặt gì; giáo viên, học sinh truy cập bằng trình duyệt qua Internet. File mô hình 3D được phân phối thêm qua CDN (mạng phân phối nội dung) để giảm tải cho máy chủ trung tâm.


### 1.5.6. JWT (JSON Web Token)

- **Mục đích sử dụng:** xác thực và phân quyền người dùng.
- **Vì sao chọn:** cơ chế không lưu phiên trên máy chủ (stateless), phù hợp RESTful API và WebSocket.
- **Triển khai thực tế:** khi đăng nhập, hệ thống cấp hai token. **Access token** thời hạn 15 phút, chứa mã người dùng, vai trò và trường, được giao diện giữ trong bộ nhớ và gửi kèm mọi API; máy chủ dựa vào vai trò để cho phép xem bài, giao bài, nạp mô hình hay quản trị hệ thống. **Refresh token** thời hạn 8 giờ, nằm trong cookie httpOnly (mã JavaScript không đọc được), chỉ dùng để xin access token mới khi access token hết hạn. Đổi mật khẩu, được đặt lại mật khẩu hoặc bị khóa tài khoản thì mọi refresh token cũ mất hiệu lực.

## 1.6. Công cụ phát triển hệ thống

- **Visual Studio Code:** môi trường lập trình chính cho cả frontend (React, Three.js) và backend (FastAPI).
- **Git / GitHub:** quản lý phiên bản mã nguồn, theo dõi tiến độ, sao lưu dự án.
- **Swagger UI (tích hợp sẵn trong FastAPI) và Postman:** kiểm thử các endpoint API độc lập với giao diện.
- **Blender:** phần mềm 3D mã nguồn mở, dùng để kiểm tra, chỉnh sửa và chuyển đổi mô hình miễn phí hoặc mô hình thuê thiết kế sang GLB theo chuẩn hệ thống.
- **Bộ công cụ cutaway và Playwright:** dựng mô hình máy móc bằng code; tự động chụp ảnh từng khung hình bằng trình duyệt thật để kiểm tra chất lượng mô hình và phim.
- **Docker Desktop:** chạy thử hệ thống trên máy phát triển giống môi trường triển khai.
- **Mermaid / draw.io:** vẽ các biểu đồ phân tích thiết kế (Use Case, Activity, Sequence, ERD).
- **Claude Code (trợ lý AI):** hỗ trợ viết mã dựng mô hình, kiểm tra chất lượng hình ảnh và soạn tài liệu.

## 1.7. Các thuật toán và kỹ thuật liên quan

Ngoài việc xây dựng giao diện và API, hệ thống áp dụng một số kỹ thuật đặc thù của mô phỏng 3D trong dạy học, nhằm đảm bảo bài học chính xác về kiến thức, mượt trên máy cấu hình thấp và an toàn về dữ liệu.

### 1.7.1. Kỹ thuật tháo rời mô hình và chọn bộ phận

- **Chọn bộ phận (Raycasting):** khi học sinh bấm lên màn hình, hệ thống bắn một tia từ camera qua điểm bấm vào không gian 3D, tìm phần mô hình đầu tiên mà tia cắt trúng. Phần đó được làm nổi bật và hiện chú thích tương ứng.
- **Tháo rời (Exploded view):** mỗi bộ phận có một hướng tách và khoảng cách tách định nghĩa trong file cấu hình. Vị trí bộ phận được nội suy theo thời gian với hàm làm mượt (easing), tạo chuyển động tách ra – giữ – lắp lại tự nhiên.
- **Camera bay tới:** mỗi bộ phận có một góc nhìn đẹp định sẵn; khi chọn, camera di chuyển mượt tới góc đó thay vì nhảy đột ngột, giúp học sinh không mất phương hướng.

Điều kiện để áp dụng các kỹ thuật này là **mỗi bộ phận phải là một phần riêng, có tên** trong file GLB. Đây là yêu cầu bắt buộc đối với mọi mô hình nạp vào hệ thống.

### 1.7.2. Kỹ thuật mô phỏng thí nghiệm có thông số

Mỗi bài thí nghiệm được mô tả bằng một **mô hình toán học** chạy trên máy học sinh: đầu vào là các thông số học sinh chọn, đầu ra là hiện tượng hiển thị và số liệu đo được.

Ví dụ bài chuẩn độ axit mạnh bằng bazơ mạnh (dung dịch HCl nồng độ C_a, thể tích V_a; nhỏ dần dung dịch NaOH nồng độ C_b, thể tích V_b):

- Trước điểm tương đương: [H⁺] = (C_a·V_a − C_b·V_b) / (V_a + V_b), pH = −lg[H⁺].
- Tại điểm tương đương: pH = 7 (ở 25 °C).
- Sau điểm tương đương: [OH⁻] = (C_b·V_b − C_a·V_a) / (V_a + V_b), pH = 14 + lg[OH⁻].

Từ công thức này, mỗi giọt NaOH nhỏ vào làm cập nhật pH, màu chất chỉ thị trong bình và điểm mới trên đồ thị pH theo thể tích.

Máy học sinh tính kết quả để phản hồi tức thì. Khi chấm, máy chủ **không tin con số do máy học sinh gửi lên**, vì học sinh có thể sửa yêu cầu gửi đi. Đáp án lại phụ thuộc thông số mỗi học sinh chọn, nên cấu hình bài học lưu **công thức đáp án** (ví dụ V_b = C_a·V_a / C_b) thay vì một con số. Máy chủ Python thay thông số học sinh đã chọn vào công thức để tự tính lại đáp án, rồi so với kết quả học sinh ghi nhận theo **sai số cho phép**. Việc này rất nhẹ vì chỉ là một công thức, không phải chạy lại cả mô phỏng. Công thức được đọc bằng bộ tính biểu thức an toàn (chỉ cho phép phép toán số học), máy học sinh và máy chủ cùng dùng một công thức nên không phải viết mã hai lần.

### 1.7.3. Kỹ thuật tối ưu cho máy cấu hình thấp và mạng yếu

- **Giới hạn dung lượng mô hình:** mỗi mô hình có ngưỡng tối đa về số đa giác và kích thước texture, được kiểm tra tự động khi nạp.
- **Nén Draco và texture:** giảm dung lượng tải về nhiều lần.
- **Tải lười (lazy loading):** chỉ tải mô hình khi học sinh mở bài; ảnh đại diện bài học dùng ảnh tĩnh nhẹ.
- **Bộ nhớ đệm trình duyệt và CDN:** file mô hình được phân phối qua CDN, kèm thông tin cho phép trình duyệt lưu lại file đã tải; mở lại bài không cần tải lại. CDN giảm tải cho máy chủ trung tâm nhưng không tăng được băng thông Internet của trường, nên mô hình nên giữ dưới mức cảnh báo 50 MB (mục 1.7.4): cả lớp 40 học sinh tải lần đầu mất khoảng 3 phút qua đường truyền 100 Mbps, các lần sau dùng lại file đã lưu.
- **Mục tiêu hiệu năng:** đạt tối thiểu 30 khung hình/giây trên máy tính bảng và máy tính phổ thông của nhà trường.

### 1.7.4. Kỹ thuật kiểm tra mô hình khi nạp

Khi biên tập viên nạp một mô hình mới, hệ thống tự động kiểm tra trước khi cho phép dùng trong bài học:

- File đúng định dạng GLB, đọc được.
- Dung lượng, số đa giác, kích thước texture không vượt mức chặn (150 MB, 1,5 triệu tam giác, texture 4096 px). Vượt mức cảnh báo (50 MB, 500.000 tam giác, texture 2048 px) thì hệ thống vẫn cho nạp nhưng nhắc biên tập viên, vì cả lớp tải cùng lúc có thể chậm. Hệ thống không tự nén lại mô hình, để giữ nguyên chất lượng hình ảnh gốc.
- Tên các phần trong mô hình khớp với danh sách bộ phận khai báo trong bài học.
- Đã khai báo loại nguồn; nếu là CC BY hoặc CC BY-SA thì bắt buộc có dòng ghi công.

Mô hình không đạt bị từ chối kèm thông báo lỗi cụ thể, tránh đưa mô hình lỗi tới học sinh.

### 1.7.5. Kỹ thuật xác thực và phân quyền (JWT + RBAC)

Hệ thống áp dụng xác thực bằng JWT và phân quyền theo vai trò (Role-Based Access Control). Mỗi tài khoản giữ đúng một trong năm vai trò:

- **Học sinh:** học bài, làm thí nghiệm, làm bài kiểm tra, xem kết quả của mình.
- **Giáo viên:** dùng các chức năng học tập; xem lớp mình được phân công dạy, giao bài đúng môn, xem kết quả cả lớp, điều khiển màn hình lớp học.
- **Quản trị trường** (hiệu trưởng, phó hiệu trưởng, cán bộ CNTT): cấp tài khoản giáo viên, học sinh; tạo lớp, phân công giảng dạy; xem báo cáo sử dụng của trường.
- **Biên tập viên:** tạo và sửa bài học, nạp mô hình, gắn nhãn và chú thích bộ phận; tự lưu nháp hoặc xuất bản bài học.
- **Quản trị hệ thống:** quản lý các trường và tài khoản biên tập viên; xem nhật ký hệ thống; có quyền cao nhất nên làm được mọi việc của biên tập viên về bài học và mô hình.

Máy chủ kiểm tra token và vai trò trước mọi API quan trọng. Với ba vai trò thuộc nhà trường, mã trường lưu ngay trong tài khoản được đưa vào token, nên dữ liệu của trường nào chỉ người thuộc trường đó được xem. Để chống dò mật khẩu, đăng nhập sai 5 lần liên tiếp thì tài khoản bị khóa tạm: 15 phút với các vai trò quản trị và biên tập, chỉ 1 phút với giáo viên, học sinh (tên đăng nhập học sinh đoán được, khóa lâu sẽ bị lợi dụng để khóa tài khoản bạn khác). Ba vai trò quản trị và biên tập phải đổi mật khẩu ở lần đăng nhập đầu.

### 1.7.6. Kỹ thuật đồng bộ thời gian thực trong lớp học

Ở chế độ giáo viên điều khiển, giao diện của giáo viên gửi các sự kiện (xoay camera, mở bộ phận, chuyển bước) qua WebSocket tới máy chủ; máy chủ phát lại cho mọi học sinh đang ở trong "phòng" của lớp đó. Để tránh quá tải, sự kiện xoay camera được gộp và gửi tối đa khoảng 10 lần mỗi giây, máy học sinh tự nội suy chuyển động mượt giữa các lần nhận.

### 1.7.7. Kỹ thuật kiểm tra dữ liệu đầu vào và xử lý lỗi

- **Phía client:** kiểm tra trường bắt buộc, khoảng giá trị thông số thí nghiệm trước khi gửi.
- **Phía server:** Pydantic kiểm tra lại toàn bộ dữ liệu theo schema, tránh dữ liệu sai hoặc độc hại được lưu vào CSDL.
- **Middleware xác thực:** kiểm tra access token trước khi xử lý request; token không hợp lệ hoặc hết hạn bị từ chối, giao diện dùng refresh token để xin token mới.
- **Middleware xử lý lỗi:** bắt các ngoại lệ, trả về thông báo lỗi tiếng Việt rõ ràng dưới dạng JSON.

## 1.8. Kết chương

Chương này đã trình bày tổng quan về phòng thí nghiệm ảo 3D trong dạy học STEM, các căn cứ chương trình và tiêu chuẩn, cùng nền tảng lý thuyết và công nghệ để xây dựng hệ thống.

Xuất phát từ quy định mỗi trường tối đa 03 phần mềm thí nghiệm ảo, hệ thống được định hướng là **một nền tảng duy nhất cho ba môn Vật lí, Hóa học, Sinh học ở cả ba cấp học**, Việt hóa hoàn toàn và bám theo sách giáo khoa. Hệ thống được xây dựng theo mô hình Client – Server: phần dựng hình 3D và mô phỏng thí nghiệm chạy trên máy học sinh bằng React và Three.js; máy chủ FastAPI tổ chức theo kiến trúc đa tầng, cung cấp RESTful API và WebSocket; dữ liệu lưu trong PostgreSQL; toàn bộ được đóng gói bằng Docker và triển khai trên một máy chủ trung tâm cho tất cả các trường.

Về nội dung, hệ thống không phụ thuộc cách làm mô hình: mô hình máy móc dựng bằng code, mô hình mô sống lấy từ nguồn miễn phí có giấy phép phù hợp hoặc thuê thiết kế, tất cả nạp vào theo chuẩn GLB và được kiểm tra tự động.

Những cơ sở lý thuyết và công nghệ trên là nền tảng cho việc phân tích, thiết kế hệ thống được trình bày chi tiết ở Chương 2.
