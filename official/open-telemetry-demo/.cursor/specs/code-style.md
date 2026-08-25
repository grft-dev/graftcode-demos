# Code Style

## REST API (.NET)

We write REST in a **full, non-minified** form:

- **Do not use** minimal API — each endpoint lives in a **separate controller** (`Controller`).
- Models are defined as **separate, full classes**.
- **Do not use** a minified `Program.cs` (top-level statements) — use a **full `Program` class** with a `Main` method.
- **Do not use** minified (expression-bodied) methods `=>` — write full methods with a `{ ... }` body.
- **Do not use** minified DTOs as a `record` with constructor-only arguments — use **full classes** with properties instead.

### Examples

```csharp
// ❌ BAD — top-level statements (minified Program.cs)
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.MapGet("/users", () => Results.Ok(users));
app.Run();
```

```csharp
// ✅ GOOD — full Program class
public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddControllers();

        var app = builder.Build();
        app.MapControllers();
        app.Run();
    }
}
```

```csharp
// ❌ BAD — minified DTO as a record
public record UserDto(int Id, string Name);
```

```csharp
// ✅ GOOD — full DTO class
public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

```csharp
// ❌ BAD — expression-bodied method
public IActionResult GetUser(int id) => Ok(_service.Get(id));
```

```csharp
// ✅ GOOD — full method with a body
public IActionResult GetUser(int id)
{
    var user = _service.Get(id);
    return Ok(user);
}
```
