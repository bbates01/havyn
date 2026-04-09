using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mission11_Bates.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomUserColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AspNetUsers' AND column_name='SafehouseId') THEN
                        ALTER TABLE ""AspNetUsers"" ADD ""SafehouseId"" integer;
                    END IF;
                                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AspNetUsers' AND column_name='SocialWorkerCode') THEN
                        ALTER TABLE ""AspNetUsers"" ADD ""SocialWorkerCode"" text;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AspNetUsers' AND column_name='SupporterId') THEN
                        ALTER TABLE ""AspNetUsers"" ADD ""SupporterId"" integer;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "SafehouseId", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "SocialWorkerCode", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "SupporterId", table: "AspNetUsers");
        }
    }
}