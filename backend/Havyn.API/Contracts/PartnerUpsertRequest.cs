namespace Havyn.Contracts;

/// <summary>
/// API body for create/update. Kept free of data annotations so automatic model validation
/// does not reject valid camelCase JSON before the action runs.
/// </summary>
public class PartnerUpsertRequest
{
    public string? PartnerName { get; set; }
    public string? PartnerType { get; set; }
    public string? RoleType { get; set; }
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Region { get; set; }
    public string? Status { get; set; }
    /// <summary>ISO date (yyyy-MM-dd) from the client.</summary>
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Notes { get; set; }
}
