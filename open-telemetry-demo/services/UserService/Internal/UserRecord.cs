namespace UserService.Internal;

internal class UserRecord
{
    public string Password { get; set; } = string.Empty;

    public string[] Cities { get; set; } = Array.Empty<string>();
}
