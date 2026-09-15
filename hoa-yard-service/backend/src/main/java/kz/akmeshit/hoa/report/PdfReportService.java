package kz.akmeshit.hoa.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfReportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD);
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
    private static final Font CELL_FONT = new Font(Font.HELVETICA, 9);

    public byte[] render(ReportDataAggregator.ReportData data) {
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            document.add(new Paragraph(
                    "Отчёт по эксплуатации двора · Ақмешіт 9", TITLE_FONT));
            document.add(new Paragraph(
                    "Период: %s — %s".formatted(data.from().format(DATE_FMT), data.to().format(DATE_FMT))));
            document.add(Chunk.NEWLINE);

            document.add(summaryTable(data));
            document.add(Chunk.NEWLINE);
            document.add(tasksTable(data));

            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new ReportRenderException("Не удалось сформировать PDF", e);
        }
    }

    private PdfPTable summaryTable(ReportDataAggregator.ReportData data) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        addSummaryCell(table, "Всего задач", String.valueOf(data.totalTasks()));
        addSummaryCell(table, "Выполнено", String.valueOf(data.doneTasks()));
        addSummaryCell(table, "% закрытия", "%.1f%%".formatted(data.closureRatePercent()));
        addSummaryCell(table, "Просрочено", String.valueOf(data.overdueTasks()));
        return table;
    }

    private void addSummaryCell(PdfPTable table, String label, String value) {
        Paragraph p = new Paragraph(label + "\n" + value, CELL_FONT);
        table.addCell(p);
    }

    private PdfPTable tasksTable(ReportDataAggregator.ReportData data) throws DocumentException {
        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.5f, 1.5f, 2f, 2f, 1.5f, 1f});

        for (String header : new String[]{"Дата", "Исполнитель", "Зона", "Работа", "Статус", "Время, мин"}) {
            var cell = new com.lowagie.text.pdf.PdfPCell(new Phrase(header, HEADER_FONT));
            cell.setBackgroundColor(new Color(0x18, 0x18, 0x1B));
            table.addCell(cell);
        }

        for (var row : data.rows()) {
            table.addCell(new Phrase(row.date().format(DATE_FMT), CELL_FONT));
            table.addCell(new Phrase(row.assigneeName(), CELL_FONT));
            table.addCell(new Phrase(row.zoneName(), CELL_FONT));
            table.addCell(new Phrase(row.workTemplateName(), CELL_FONT));
            table.addCell(new Phrase(row.status().name(), CELL_FONT));
            table.addCell(new Phrase(row.durationMinutes() != null ? row.durationMinutes().toString() : "—", CELL_FONT));
        }
        return table;
    }

    public static class ReportRenderException extends RuntimeException {
        public ReportRenderException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
