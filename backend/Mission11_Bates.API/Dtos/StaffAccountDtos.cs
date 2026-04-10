namespace Mission11_Bates.Dtos;

public class StaffAccountSummaryDto
{
    public string Id { get; set; } = "";
    public string? Email { get; set; }
    public string DisplayName { get; set; } = "";
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    public int? SafehouseId { get; set; }
    public string? SocialWorkerCode { get; set; }
    public int? SupporterId { get; set; }
}

public class UpdateStaffAccountDto
{
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int? SafehouseId { get; set; }
}
