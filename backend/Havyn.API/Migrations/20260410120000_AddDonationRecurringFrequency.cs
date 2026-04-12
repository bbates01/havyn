using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Havyn.Migrations
{
    /// <inheritdoc />
    public partial class AddDonationRecurringFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'Donations' AND column_name = 'RecurringFrequency') THEN
                        ALTER TABLE ""Donations"" ADD ""RecurringFrequency"" text;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Donations"" DROP COLUMN IF EXISTS ""RecurringFrequency"";
            ");
        }
    }
}
