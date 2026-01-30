using ExamManager.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ExamManager.Configurations;

public class ExamBoardDocument : IDocument
{
    private readonly Exam _exam;
    
    public ExamBoardDocument(Exam exam)
    {
        _exam = exam ?? throw new ArgumentNullException(nameof(exam));
    }
    
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container
            .Page(page =>
            {
                page.Margin(50);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(x=> x.FontSize(11).FontFamily(Fonts.Arial));
                
                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
    }

    private void ComposeHeader(IContainer container)
    {
        var titleStyle = TextStyle.Default.Size(20).SemiBold().FontColor(Colors.Blue.Medium);
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text($"Exam Board Report").Style(titleStyle);
                column.Item().Text(text =>
                {
                    text.Span("Generated on: ");
                    text.Span($"{DateTime.Now:d}").SemiBold();
                });
            });
        });
    }
    
    private void ComposeContent(IContainer container)
    {
        container.PaddingVertical(40).Column(column =>
        {
            column.Spacing(20);

            column.Item().Element(ComposeExamDetails);

            column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            column.Item().Element(ComposeExaminersTable);
            
            column.Item().PaddingTop(30).Element(ComposeSignatures);
        });
    }
    
    private void ComposeExamDetails(IContainer container)
    {
        container.ShowEntire().Background(Colors.Grey.Lighten4).Padding(15).Border(1).BorderColor(Colors.Grey.Lighten2).Column(column =>
        {
            column.Spacing(5);
            column.Item().Text(_exam.ExamName).FontSize(16).SemiBold().FontColor(Colors.Black);
            column.Item().Text($"Code: {_exam.ExamCode}").FontSize(12).Italic();
            
            column.Item().PaddingTop(10).Grid(grid =>
            {
                grid.Columns(2);
                grid.Spacing(5);

                void InfoRow(string label, string value)
                {
                    grid.Item().Text(text =>
                    {
                        text.Span($"{label}: ").SemiBold();
                        text.Span(value);
                    });
                }

                InfoRow("Date", _exam.ExamDate.ToString("d")); 
                InfoRow("Institution", _exam.Institution?.Name ?? "N/A");
                InfoRow("Profession", _exam.Profession?.ProfessionName ?? "N/A");
                InfoRow("Exam Type", _exam.ExamType?.TypeName ?? "N/A");
            });
        });
    }
    
    private void ComposeExaminersTable(IContainer container)
    {
        var headerStyle = TextStyle.Default.SemiBold().FontColor(Colors.White);

        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(30); 
                columns.RelativeColumn();  
                columns.RelativeColumn();  
            });

            table.Header(header =>
            {
                header.Cell().RowSpan(1).Element(CellStyle).Text("#");
                header.Cell().Element(CellStyle).Text("Examiner Name");
                header.Cell().Element(CellStyle).Text("Assigned Role");

                static IContainer CellStyle(IContainer container)
                {
                    return container.DefaultTextStyle(x => x.SemiBold())
                        .PaddingVertical(5)
                        .PaddingHorizontal(10)
                        .BorderBottom(1)
                        .BorderColor(Colors.Black)
                        .Background(Colors.Blue.Medium) 
                        .AlignMiddle();
                }
            });

            int index = 1;
            foreach (var board in _exam.ExamBoard)
            {
                var examinerName = board.Examiner != null 
                    ? $"{board.Examiner.FirstName} {board.Examiner.LastName}" 
                    : "Unknown Examiner";

                table.Cell().Element(Block).Text($"{index}");
                table.Cell().Element(Block).Text(examinerName);
                table.Cell().Element(Block).Text(board.Role);

                static IContainer Block(IContainer container)
                {
                    return container.BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten3)
                        .PaddingVertical(5)
                        .PaddingHorizontal(10)
                        .AlignMiddle();
                }
                
                index++;
            }
        });
    }

    private void ComposeSignatures(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("_________________________").AlignCenter();
                col.Item().Text("Chief Examiner Signature").AlignCenter().FontSize(9);
            });
            
            row.ConstantItem(50); // Spacer

            row.RelativeItem().Column(col =>
            {
                col.Item().Text("_________________________").AlignCenter();
                col.Item().Text("Institution Head Signature").AlignCenter().FontSize(9);
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Text(x =>
            {
                x.Span("ExamManager System - Confidential").FontSize(8).FontColor(Colors.Grey.Medium);
            });
            
            row.RelativeItem().AlignRight().Text(x =>
            {
                x.CurrentPageNumber();
                x.Span(" / ");
                x.TotalPages();
            });
        });
    }
}