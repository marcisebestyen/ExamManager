using ExamManager.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ExamManager.Configurations;

public class ExamBoardDocument : IDocument
{
    private readonly Exam _exam;

    private readonly string _title;
    private readonly string _generatedOn;
    private readonly string _dateLabel;
    private readonly string _institutionLabel;
    private readonly string _professionLabel;
    private readonly string _typeLabel;
    private readonly string _tableHeaderName;
    private readonly string _tableHeaderRole;
    private readonly string _chiefSig;
    private readonly string _headSig;
    private readonly string _unknown;
    private readonly string _confidential;
    private readonly string _code;
    
    public ExamBoardDocument(Exam exam, string languageCode = "en")
    {
        _exam = exam ?? throw new ArgumentNullException(nameof(exam));
        
        if (languageCode.StartsWith("hu", StringComparison.OrdinalIgnoreCase))
        {
            _title = "Vizsgabizottsági Jelentés";
            _generatedOn = "Létrehozva: ";
            _dateLabel = "Dátum";
            _institutionLabel = "Intézmény";
            _professionLabel = "Szakma";
            _typeLabel = "Vizsgatípus";
            _tableHeaderName = "Vizsgáztató neve";
            _tableHeaderRole = "Szerepkör";
            _chiefSig = "Elnök aláírása";
            _headSig = "Intézményvezető aláírása";
            _unknown = "Ismeretlen vizsgáztató";
            _confidential = "ExamManager rendszer – Bizalmas";
            _code = "Kód";
        }
        else if (languageCode.StartsWith("de", StringComparison.OrdinalIgnoreCase))
        {
            _title = "Prüfungsausschussbericht";
            _generatedOn = "Erstellt am: ";
            _dateLabel = "Datum";
            _institutionLabel = "Institution";
            _professionLabel = "Beruf";
            _typeLabel = "Prüfungsart";
            _tableHeaderName = "Name des Prüfers";
            _tableHeaderRole = "Rolle";
            _chiefSig = "Unterschrift des Vorsitzenden";
            _headSig = "Unterschrift der Schulleitung";
            _unknown = "Unbekannter Prüfer/in";
            _confidential = "ExamManager-System – Vertraulich";
            _code = "Code";
        }
        else
        {
            _title = "Exam Board Report";
            _generatedOn = "Generated on: ";
            _dateLabel = "Date";
            _institutionLabel = "Institution";
            _professionLabel = "Profession";
            _typeLabel = "Exam Type";
            _tableHeaderName = "Examiner Name";
            _tableHeaderRole = "Assigned Role";
            _chiefSig = "Chief Examiner Signature";
            _headSig = "Institution Head Signature";
            _unknown = "Unknown Examiner";
            _confidential = "ExamManager System - Confidential";
            _code = "Code";
        }
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
                column.Item().Text(_title).Style(titleStyle);
                column.Item().Text(text =>
                {
                    text.Span(_generatedOn);
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
            column.Item().Text($"{_code}: {_exam.ExamCode}").FontSize(12).Italic();
            
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

                InfoRow(_dateLabel, _exam.ExamDate.ToString("d")); 
                InfoRow(_institutionLabel, _exam.Institution?.Name ?? "N/A");
                InfoRow(_professionLabel, _exam.Profession?.ProfessionName ?? "N/A");
                InfoRow(_typeLabel, _exam.ExamType?.TypeName ?? "N/A");
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
                header.Cell().Element(CellStyle).Text(_tableHeaderName);
                header.Cell().Element(CellStyle).Text(_tableHeaderRole);

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
                    : $"{_unknown}";

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
                col.Item().Text(_chiefSig).AlignCenter().FontSize(9);
            });
            
            row.ConstantItem(50); 

            row.RelativeItem().Column(col =>
            {
                col.Item().Text("_________________________").AlignCenter();
                col.Item().Text(_headSig).AlignCenter().FontSize(9);
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Text(x =>
            {
                x.Span(_confidential).FontSize(8).FontColor(Colors.Grey.Medium);
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