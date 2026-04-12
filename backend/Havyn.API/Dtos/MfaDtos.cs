namespace Havyn.Dtos;

public class MfaStatusDto
{
    public bool IsMfaEnabled { get; set; }
    public bool HasAuthenticator { get; set; }
}

public class MfaSetupDto
{
    public string SharedKey { get; set; } = string.Empty;
    public string AuthenticatorUri { get; set; } = string.Empty;
    public string QrCodeDataUri { get; set; } = string.Empty;
}

public class EnableMfaDto
{
    public string VerificationCode { get; set; } = string.Empty;
}

public class VerifyMfaDto
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class DisableMfaDto
{
    public string Password { get; set; } = string.Empty;
}
