namespace UserService.Internal;

internal static class UserStore
{
    private static readonly Dictionary<string, UserRecord> Users = new(StringComparer.OrdinalIgnoreCase)
    {
        ["wad"] = new UserRecord
        {
            Password = "password",
            Cities = new[] { "Warsaw", "London", "New York", "Tokyo" }
        },
        ["alice"] = new UserRecord
        {
            Password = "alice",
            Cities = new[] { "Paris", "Berlin", "Rome" }
        },
        ["bob"] = new UserRecord
        {
            Password = "bob",
            Cities = new[] { "Sydney", "Toronto", "Dubai" }
        }
    };

    public static bool TryAuthenticate(string username, string password, out UserRecord user)
    {
        user = null!;
        if (!Users.TryGetValue(username, out var record))
        {
            return false;
        }

        if (!string.Equals(record.Password, password, StringComparison.Ordinal))
        {
            return false;
        }

        user = record;
        return true;
    }

    public static string[] GetCitiesForUser(string username)
    {
        if (!Users.TryGetValue(username, out var record))
        {
            throw new Exception("User not found.");
        }

        return record.Cities;
    }
}
