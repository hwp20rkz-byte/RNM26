package kz.akmeshit.hoa.report;

import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.format.DateTimeFormatter;

@Service
public class DocxReportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public byte[] render(ReportDataAggregator.ReportData data) {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph title = doc.createParagraph();
            XWPFRun titleRun = title.createRun();
            titleRun.setText("Отчёт по эксплуатации двора · Ақмешіт 9");
            titleRun.setBold(true);
            titleRun.setFontSize(16);

            XWPFParagraph period = doc.createParagraph();
            period.createRun().setText(
                    "Период: %s — %s".formatted(data.from().format(DATE_FMT), data.to().format(DATE_FMT)));

            XWPFParagraph summary = doc.createParagraph();
            summary.createRun().setText(
                    "Всего задач: %d · Выполнено: %d · %% закрытия: %.1f%% · Просрочено: %d".formatted(
                            data.totalTasks(), data.doneTasks(), data.closureRatePercent(), data.overdueTasks()));

            doc.createParagraph().createRun().addBreak();

            String[] headers = {"Дата", "Исполнитель", "Зона", "Работа", "Статус", "Время, мин"};
            XWPFTable table = doc.createTable(data.rows().size() + 1, headers.length);
            for (int i = 0; i < headers.length; i++) {
                setCellText(table.getRow(0).getCell(i), headers[i], true);
            }
            int rowIdx = 1;
            for (var row : data.rows()) {
                XWPFTableRow tr = table.getRow(rowIdx++);
                setCellText(tr.getCell(0), row.date().format(DATE_FMT), false);
                setCellText(tr.getCell(1), row.assigneeName(), false);
                setCellText(tr.getCell(2), row.zoneName(), false);
                setCellText(tr.getCell(3), row.workTemplateName(), false);
                setCellText(tr.getCell(4), row.status().name(), false);
                setCellText(tr.getCell(5), row.durationMinutes() != null ? row.durationMinutes().toString() : "—", false);
            }

            doc.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось сформировать DOCX", e);
        }
    }

    private void setCellText(XWPFTableCell cell, String text, boolean bold) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(9);
    }
}
