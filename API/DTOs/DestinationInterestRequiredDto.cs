namespace API.DTOs;

public class DestinationInterestRequiredDto
{
    public string Code { get; set; } = "DESTINATION_INTEREST_REQUIRED";
    public string Message { get; set; } = "Choose your interests at the destination.";
    public IReadOnlyList<string> Interests { get; set; } = [];
}