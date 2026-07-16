using Microsoft.Data.SqlClient;

namespace AccountService.Internal;

internal sealed class UserRepository
{
    private readonly string _connectionString;

    public UserRepository(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("AZURE_SQL_CONNECTION_STRING is not configured.");
        }

        _connectionString = connectionString;
    }

    public void EnsureSchemaAndSeedData()
    {
        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                IF DB_ID('CityWeatherDemo') IS NULL
                BEGIN
                    CREATE DATABASE CityWeatherDemo;
                END
                """;
            command.ExecuteNonQuery();
        }

        var builder = new SqlConnectionStringBuilder(_connectionString)
        {
            InitialCatalog = "CityWeatherDemo"
        };

        using var demoConnection = new SqlConnection(builder.ConnectionString);
        demoConnection.Open();

        using (var command = demoConnection.CreateCommand())
        {
            command.CommandText = """
                IF OBJECT_ID('dbo.Users', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.Users
                    (
                        Username NVARCHAR(64) NOT NULL PRIMARY KEY,
                        PasswordHash NVARCHAR(256) NOT NULL,
                        PasswordSalt NVARCHAR(64) NOT NULL
                    );
                END

                IF OBJECT_ID('dbo.UserCities', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.UserCities
                    (
                        Username NVARCHAR(64) NOT NULL,
                        CityName NVARCHAR(128) NOT NULL,
                        SortOrder INT NOT NULL,
                        CONSTRAINT PK_UserCities PRIMARY KEY (Username, CityName),
                        CONSTRAINT FK_UserCities_Users FOREIGN KEY (Username) REFERENCES dbo.Users(Username)
                    );
                END
                """;
            command.ExecuteNonQuery();
        }

        SeedUser(demoConnection, "wad", "password", "Warsaw", "London", "New York", "Tokyo");
        SeedUser(demoConnection, "alice", "alice", "Paris", "Berlin", "Rome");
        SeedUser(demoConnection, "bob", "bob", "Sydney", "Toronto", "Dubai");
    }

    public bool ValidateCredentials(string username, string password)
    {
        using var connection = OpenDemoConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT PasswordHash, PasswordSalt
            FROM dbo.Users
            WHERE Username = @username
            """;
        command.Parameters.AddWithValue("@username", username);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return false;
        }

        var hash = reader.GetString(0);
        var salt = reader.GetString(1);
        return PasswordHasher.VerifyPassword(password, hash, salt);
    }

    public string[] GetCitiesForUser(string username)
    {
        using var connection = OpenDemoConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT CityName
            FROM dbo.UserCities
            WHERE Username = @username
            ORDER BY SortOrder
            """;
        command.Parameters.AddWithValue("@username", username);

        var cities = new List<string>();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            cities.Add(reader.GetString(0));
        }

        if (cities.Count == 0)
        {
            throw new Exception("User not found.");
        }

        return cities.ToArray();
    }

    public bool IsCityAllowedForUser(string username, string cityName)
    {
        using var connection = OpenDemoConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(1)
            FROM dbo.UserCities
            WHERE Username = @username
              AND CityName = @cityName
            """;
        command.Parameters.AddWithValue("@username", username);
        command.Parameters.AddWithValue("@cityName", cityName);

        var count = (int)command.ExecuteScalar()!;
        return count > 0;
    }

    private SqlConnection OpenDemoConnection()
    {
        var builder = new SqlConnectionStringBuilder(_connectionString)
        {
            InitialCatalog = "CityWeatherDemo"
        };
        var connection = new SqlConnection(builder.ConnectionString);
        connection.Open();
        return connection;
    }

    private static void SeedUser(SqlConnection connection, string username, string password, params string[] cities)
    {
        using (var existsCommand = connection.CreateCommand())
        {
            existsCommand.CommandText = "SELECT COUNT(1) FROM dbo.Users WHERE Username = @username";
            existsCommand.Parameters.AddWithValue("@username", username);
            var exists = (int)existsCommand.ExecuteScalar()! > 0;
            if (exists)
            {
                return;
            }
        }

        var (hash, salt) = PasswordHasher.HashPassword(password);

        using (var insertUser = connection.CreateCommand())
        {
            insertUser.CommandText = """
                INSERT INTO dbo.Users (Username, PasswordHash, PasswordSalt)
                VALUES (@username, @hash, @salt)
                """;
            insertUser.Parameters.AddWithValue("@username", username);
            insertUser.Parameters.AddWithValue("@hash", hash);
            insertUser.Parameters.AddWithValue("@salt", salt);
            insertUser.ExecuteNonQuery();
        }

        for (var index = 0; index < cities.Length; index++)
        {
            using var insertCity = connection.CreateCommand();
            insertCity.CommandText = """
                INSERT INTO dbo.UserCities (Username, CityName, SortOrder)
                VALUES (@username, @cityName, @sortOrder)
                """;
            insertCity.Parameters.AddWithValue("@username", username);
            insertCity.Parameters.AddWithValue("@cityName", cities[index]);
            insertCity.Parameters.AddWithValue("@sortOrder", index + 1);
            insertCity.ExecuteNonQuery();
        }
    }
}
